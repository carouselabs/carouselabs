// app/api/ext/generate/route.ts — the Comment extension's core Generate flow.
// Bearer-token authenticated, same as the rest of app/api/ext/* (see
// lib/extensionCommentAuth.ts). Reply generation has no route of its own: it
// goes through this one (body.reply).
//
// Access (lib/extAccess.ts): an active extension subscription, or one of the
// account's free generations. The free use is reserved just before the model
// call and given back if the request fails, so a user is never charged for
// output they never saw, and a failed request writes no CommentHistory row.
import { NextResponse } from "next/server"
import { extDailyLimitResponse } from "@/lib/extDailyLimit"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { reserveExtGeneration } from "@/lib/extAccess"
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
  buildReplySystemMessage,
  buildReplyUserMessage,
  targetLengthRange,
  WEAK_COMMENT_PATTERNS,
  ANTI_FABRICATION_REMINDER,
  type CommentPostInput,
  type CommentReplyInput,
  type ReplyThreadEntryInput,
} from "@/lib/ai/prompts/commentPrompt"
import { callCommentModel, parseComment, sanitizeComment, PRIMARY_MODEL } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"

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
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  // Shared daily cap across every extension generation route. Generate and
  // Regenerate both count, since both call this route.
  const limited = await extDailyLimitResponse(user.id)
  if (limited) return limited

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
  if (!profile) {
    return NextResponse.json({ error: "Comment profile not found" }, { status: 404 })
  }

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveExtGeneration(user.id)
  if (!gate.ok) return gate.response

  const systemMessage = reply
    ? buildReplySystemMessage(profile, reply.isOwnPost)
    : buildCommentSystemMessage(profile)
  const userMessage = reply
    ? buildReplyUserMessage(post, reply, extraInstruction)
    : buildCommentUserMessage(post, extraInstruction)
  const replyTarget = reply?.thread.find((entry) => entry.isTarget) ?? null
  const { min, max } = targetLengthRange(profile.length)

  // Everything the model is allowed to source a number from.
  // In reply mode the thread is part of what the model was shown, so a figure
  // quoted from any comment in it counts as sourced.
  const numberSources = [
    post.text,
    post.headline,
    post.author,
    extraInstruction ?? "",
    ...(reply?.thread.map((entry) => entry.text) ?? []),
  ].join(" ")

  let comment = ""
  // A generation that is clean but off-length is held here rather than
  // discarded: if the retry then errors outright, returning a slightly long
  // comment beats failing the request entirely. Fabricated output is never
  // stored here: returning it would defeat the guardrail below.
  let offLengthFallback = ""
  // Set when the previous attempt invented a figure, so the retry carries the
  // blunter reminder rather than the same message that already failed.
  let remindAboutFabrication = false

  // Two attempts: the first failure (unparseable, empty, mostly-banned filler,
  // invented figures, or wildly off the profile's length) is retried once
  // before giving up.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const message = remindAboutFabrication
      ? `${userMessage}\n\n${ANTI_FABRICATION_REMINDER}`
      : userMessage

    let raw: string
    try {
      raw = await callCommentModel(systemMessage, message, "ext/generate")
    } catch (err) {
      console.error(`[ext/generate] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const parsed = parseComment(raw)
    if (!parsed?.trim()) {
      console.warn(`[ext/generate] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const { comment: cleaned, removedChars } = sanitizeComment(parsed)

    // Sanitising away a large slice means the model leaned on banned filler
    // rather than saying anything, so it's worth one more roll.
    if (removedChars > parsed.length * 0.25) {
      console.warn(`[ext/generate] attempt ${attempt}: ${removedChars} chars stripped, retrying`)
      continue
    }

    // Invented figures are checked before anything else that could let the
    // text through: a comment carrying a made-up statistic is never returned,
    // and never kept as a fallback, even on the final attempt. Failing the
    // request is the safer outcome, since the user posts this under their name.
    const unsourced = findUnsourcedNumbers(cleaned, numberSources)
    if (unsourced.length > 0) {
      console.warn(
        `[ext/generate] attempt ${attempt}: unsourced figures (${unsourced.join(", ")}) not in post or instruction, discarding`,
      )
      remindAboutFabrication = true
      continue
    }

    // Generic-AI tells are retried rather than stripped: they are positional
    // or mid-sentence, so deleting them would leave broken text. A second roll
    // usually lands somewhere more specific.
    const weak = WEAK_COMMENT_PATTERNS.filter(({ pattern }) => pattern.test(cleaned))
    if (weak.length > 0 && attempt === 1) {
      console.warn(
        `[ext/generate] attempt ${attempt}: weak patterns (${weak
          .map((w) => w.label)
          .join(", ")}), retrying`,
      )
      if (!offLengthFallback) offLengthFallback = cleaned
      continue
    }

    if (cleaned.length < min || cleaned.length > max) {
      console.warn(
        `[ext/generate] attempt ${attempt}: length ${cleaned.length} outside ${min}-${max}, retrying`,
      )
      if (!offLengthFallback) offLengthFallback = cleaned
      continue
    }

    comment = cleaned
    break
  }

  if (!comment) comment = offLengthFallback

  if (!comment) {
    // The free use is given back and no history row is written — the user
    // sees an error and can retry.
    await gate.release()
    return NextResponse.json(
      { error: "Something went wrong, try again" },
      { status: 502 },
    )
  }

  // action stays NONE until the user actually copies or inserts the comment;
  // the id goes back to the client so it can PATCH that field when they do.
  const history = await db.commentHistory.create({
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
      comment,
      action: "NONE",
      // The extension doesn't spend web-app credits (it has its own
      // subscription), so nothing is charged against the web balance.
      creditsUsed: 0,
      model: PRIMARY_MODEL,
    },
  })

  return NextResponse.json({
    comment,
    freeRemaining: gate.freeRemaining,
    historyId: history.id,
  })
}
