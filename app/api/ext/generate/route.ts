// app/api/ext/generate/route.ts — the Comment extension's core Generate flow.
// Bearer-token authenticated, same as the rest of app/api/ext/* (see
// lib/extensionCommentAuth.ts). Reply generation has no route of its own: it
// goes through this one (body.reply).
//
// Access (lib/extAccess.ts): an active extension subscription, or one of the
// account's free generations. The free use is reserved just before the model
// call and given back if the request fails, so a user is never charged for
// output they never saw, and a failed request writes no CommentHistory row.
//
// Two response shapes, one pipeline. A request with `Accept: text/event-stream`
// (the side panel from 1.3.0) gets the comment as it is written, as
// server-sent events; anything else (1.2.0 and earlier) gets the finished
// comment as JSON, exactly as before. Every check — auth, daily limit, body,
// profile, paywall — runs before either response starts, so failures keep
// their JSON bodies and status codes in both modes.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
  buildReplySystemMessage,
  buildReplyUserMessage,
  targetLengthRange,
  type CommentPostInput,
  type CommentReplyInput,
  type ReplyThreadEntryInput,
} from "@/lib/ai/prompts/commentPrompt"
import { generateComment, GENERIC_FAILURE, stageTimer, streamGeneration, type GenerationInput, type GenerationResult } from "@/lib/engage/commentEngine"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

// Caps on a reply payload, which arrives from a scraped page: enough for any
// real thread, small enough that one request can't carry a huge prompt.
const MAX_THREAD_ENTRIES = 30
const MAX_ENTRY_CHARS = 1500

// Returns null when the body carries no reply (plain Comment mode). Throws when
// a reply is present but unusable, so the caller answers 400 with its message.
function parseReply(raw: unknown): CommentReplyInput | null {
  if (!raw || typeof raw !== "object") return null
  const { thread, isOwnPost } = raw as { thread?: unknown; isOwnPost?: unknown }
  if (!Array.isArray(thread)) return null

  const entries: ReplyThreadEntryInput[] = thread
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      author: typeof e.author === "string" ? e.author.slice(0, 100) : "",
      text: typeof e.text === "string" ? e.text.trim().slice(0, MAX_ENTRY_CHARS) : "",
      depth: typeof e.depth === "number" && Number.isFinite(e.depth) ? Math.max(0, Math.min(5, Math.floor(e.depth))) : 0,
      isTarget: e.isTarget === true,
      isSelf: e.isSelf === true,
      isPostAuthor: e.isPostAuthor === true,
    }))

  const targetIndex = entries.findIndex((e) => e.isTarget)
  if (targetIndex === -1 || !entries[targetIndex].text) {
    throw new Error("No comment was captured to reply to. Click Reply on the comment again, then retry.")
  }

  // A long thread is trimmed around the target, so the target always survives.
  const start = Math.max(0, Math.min(targetIndex, entries.length - MAX_THREAD_ENTRIES))
  return {
    thread: entries.slice(start, start + MAX_THREAD_ENTRIES),
    isOwnPost: typeof isOwnPost === "boolean" ? isOwnPost : null,
  }
}

export async function POST(req: Request) {
  const timer = stageTimer()

  const user = await getUserFromCommentExtensionToken(req)
  timer.mark("auth")
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  // Shared daily cap across every extension generation route. Generate and
  // Regenerate both count, since both call this route.
  const preflight = await engagePreflight(user.id, null, req)
  timer.mark("limit")
  if (preflight.response) return preflight.response

  let profileId: string
  let post: CommentPostInput
  let extraInstruction: string | undefined
  // Present when the user clicked Reply under a comment rather than Comment on
  // the post; routes to the reply prompt below.
  let reply: CommentReplyInput | null

  try {
    const body = await req.json()
    profileId = body.profileId
    extraInstruction =
      typeof body.extraInstruction === "string" && body.extraInstruction.trim()
        ? body.extraInstruction.trim()
        : undefined

    const raw = body.post ?? {}
    post = {
      author: typeof raw.author === "string" ? raw.author : "",
      headline: typeof raw.headline === "string" ? raw.headline : "",
      text: typeof raw.text === "string" ? raw.text : "",
      type: typeof raw.type === "string" ? raw.type : "text",
      url: typeof raw.url === "string" ? raw.url : "",
    }

    reply = parseReply(body.reply)

    if (!profileId) throw new Error("Missing profileId")
    // A reply can stand on the comment alone (image-only posts have no text).
    if (!reply && !post.text.trim()) {
      throw new Error(
        "No post text was captured. Click Comment on the post again, then retry.",
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body"
    // Logged as well as returned: a 400 here means the extension sent a body
    // the route cannot use, which is a bug worth seeing in the server output
    // rather than only in the panel.
    console.warn(`[ext/generate] rejected request: ${message}`)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // System profiles are shared; custom ones must belong to the caller.
  const profile = await db.commentProfile.findFirst({
    where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] },
  })
  timer.mark("profile")
  if (!profile) {
    return NextResponse.json({ error: "Comment profile not found" }, { status: 404 })
  }

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveEngageGeneration(user.id, reply ? "replies" : "comments", preflight)
  timer.mark("reserve")
  if (!gate.ok) return gate.response

  const systemMessage = reply
    ? buildReplySystemMessage(profile, reply.isOwnPost)
    : buildCommentSystemMessage(profile)
  const userMessage = reply
    ? buildReplyUserMessage(post, reply, extraInstruction)
    : buildCommentUserMessage(post, extraInstruction)
  const replyTarget = reply?.thread.find((entry) => entry.isTarget) ?? null
  const { min, max } = targetLengthRange(profile.length)

  // In reply mode the thread is part of what the model was shown, so a figure
  // quoted from any comment in it counts as sourced.
  const numberSources = [
    post.text,
    post.headline,
    post.author,
    extraInstruction ?? "",
    ...(reply?.thread.map((entry) => entry.text) ?? []),
  ].join(" ")

  const input: GenerationInput = {
    systemMessage,
    userMessage,
    min,
    max,
    numberSources,
    engage: { userId: user.id, kind: reply ? "replies" : "comments" },
  }
  const beforeModelMs = timer.elapsed()

  // action stays NONE until the user actually copies or inserts the comment;
  // the id goes back to the client so it can PATCH that field when they do.
  const saveHistory = (result: GenerationResult) =>
    db.commentHistory.create({
      data: {
        userId: user.id,
        kind: reply ? "reply" : "comment",
        profileId: profile.id,
        profileName: profile.name,
        postAuthor: post.author,
        postUrl: post.url,
        // No mode column on CommentHistory, so a reply is recorded by what it
        // answered, which is also what the History screen should show for it.
        postSnippet: (replyTarget
          ? `Reply to ${replyTarget.author || "a comment"}: ${replyTarget.text}`
          : post.text
        ).slice(0, 280),
        comment: result.comment,
        action: "NONE",
        // The extension doesn't spend web-app credits (it has its own
        // subscription), so nothing is charged against the web balance.
        creditsUsed: 0,
        // Whichever model actually wrote it, which is not always the primary.
        model: result.model,
      },
    })

  // One line per generation: stage durations only.
  const logTiming = (stream: boolean, result: GenerationResult | null) => {
    const s = timer.stages
    console.log(
      `[ext/generate] timing stream=${stream ? 1 : 0} model=${result?.model || "none"} attempts=${result?.attempts ?? 0}` +
        ` auth=${s.auth} limit=${s.limit} profile=${s.profile} reserve=${s.reserve}` +
        ` ttft=${Math.round(result?.ttftMs ?? -1)} first_text=${Math.round(result?.firstTextMs ?? -1)}` +
        ` generate=${s.generate ?? -1} history=${s.history ?? -1} total=${timer.elapsed()}`,
    )
  }

  const timingSummary = (result: GenerationResult) => ({
    ...timer.stages,
    beforeModel: beforeModelMs,
    ttft: result.ttftMs === null ? null : Math.round(result.ttftMs),
    firstText: result.firstTextMs === null ? null : Math.round(result.firstTextMs),
    attempts: result.attempts,
    model: result.model,
    total: timer.elapsed(),
  })

  const wantsStream = (req.headers.get("accept") ?? "").includes("text/event-stream")

  if (!wantsStream) {
    const result = await generateComment(input)
    timer.mark("generate")
    if (!result.comment) {
      logTiming(false, result)
      // The free use is given back and no history row is written — the user
      // sees an error and can retry.
      await gate.release()
      return NextResponse.json({ error: GENERIC_FAILURE }, { status: 502 })
    }

    const history = await saveHistory(result)
    timer.mark("history")
    logTiming(false, result)

    const s = timer.stages
    const serverTiming = [
      `auth;dur=${s.auth}`,
      `limit;dur=${s.limit}`,
      `db;dur=${s.profile + s.reserve}`,
      result.ttftMs === null ? null : `ai-ttft;dur=${Math.round(result.ttftMs)}`,
      `ai;dur=${s.generate}`,
      `history;dur=${s.history}`,
      `total;dur=${timer.elapsed()}`,
    ]
      .filter(Boolean)
      .join(", ")

    return NextResponse.json(
      {
        comment: result.comment,
        freeRemaining: gate.freeRemaining,
        historyId: history.id,
      },
      { headers: { "Server-Timing": serverTiming } },
    )
  }

  return streamGeneration({
    input,
    beforeModelMs,
    onGenerated: () => timer.mark("generate"),
    onEmpty: async (result) => {
      logTiming(true, result)
      await gate.release()
    },
    onDone: async (result) => {
      const history = await saveHistory(result)
      timer.mark("history")
      logTiming(true, result)
      return {
        comment: result.comment,
        freeRemaining: gate.freeRemaining,
        historyId: history.id,
        timing: timingSummary(result),
      }
    },
  })
}
