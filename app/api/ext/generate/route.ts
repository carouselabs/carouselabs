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
import { parseComment, sanitizeComment, streamCommentModel } from "@/lib/ai/commentModel"
import { extractPartialComment, visibleCommentText } from "@/lib/ai/commentText"
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

// Milliseconds spent in each stage of one request, for the Server-Timing
// header, the stream's final event and one log line. Durations only: no
// content, no identifiers.
function stageTimer() {
  const start = performance.now()
  let last = start
  const stages: Record<string, number> = {}
  return {
    stages,
    mark(name: string) {
      const now = performance.now()
      stages[name] = Math.round(now - last)
      last = now
    },
    elapsed: () => Math.round(performance.now() - start),
  }
}

interface GenerationInput {
  systemMessage: string
  userMessage: string
  min: number
  max: number
  // Everything the model is allowed to source a number from.
  numberSources: string
}

interface GenerationHooks {
  // The current attempt's comment so far, each time more of it can be shown.
  // "" means clear what was shown.
  onText?: (text: string) => void
  // The attempt that was just shown has been discarded and another begins.
  onRetry?: (attempt: number) => void
}

interface GenerationResult {
  comment: string
  // The model that wrote `comment` ("" when every attempt failed).
  model: string
  attempts: number
  // From the start of generation: first token of the first attempt, and the
  // first moment any comment text could be shown.
  ttftMs: number | null
  firstTextMs: number | null
}

async function generateComment(input: GenerationInput, hooks: GenerationHooks = {}): Promise<GenerationResult> {
  const start = performance.now()
  let ttftMs: number | null = null
  let firstTextMs: number | null = null

  let comment = ""
  let commentModel = ""
  // A generation that is clean but off-length is held here rather than
  // discarded: if the retry then errors outright, returning a slightly long
  // comment beats failing the request entirely. Fabricated output is never
  // stored here: returning it would defeat the guardrail below.
  let offLengthFallback: { text: string; model: string } | null = null
  // Set when the previous attempt invented a figure, so the retry carries the
  // blunter reminder rather than the same message that already failed.
  let remindAboutFabrication = false
  let attempts = 0

  // Two attempts: the first failure (unparseable, empty, mostly-banned filler,
  // invented figures, or wildly off the profile's length) is retried once
  // before giving up.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt
    if (attempt > 1) hooks.onRetry?.(attempt)

    const message = remindAboutFabrication
      ? `${input.userMessage}\n\n${ANTI_FABRICATION_REMINDER}`
      : input.userMessage

    // Mid-stream guard: the text shown so far is checked for invented figures
    // BEFORE it is shown, so a made-up statistic never reaches the screen.
    // Only whole words are ever checked (see visibleCommentText), so "8" is
    // never judged while "80%" is still arriving. Finding one stops the model
    // there — this attempt would be discarded anyway — rather than paying for
    // the rest of it.
    const controller = new AbortController()
    let invented: string[] = []
    let shown = ""
    const show = (text: string) => {
      if (text === shown) return
      shown = text
      if (text) firstTextMs ??= performance.now() - start
      hooks.onText?.(text)
    }

    let raw: string
    let model: string
    try {
      const result = await streamCommentModel(input.systemMessage, message, "ext/generate", {
        signal: controller.signal,
        onReset: () => show(""),
        onRaw: (sofar) => {
          const partial = extractPartialComment(sofar)
          if (!partial) return
          const visible = visibleCommentText(partial.text, partial.complete)
          const unsourced = findUnsourcedNumbers(visible, input.numberSources)
          if (unsourced.length > 0) {
            invented = unsourced
            controller.abort()
            return
          }
          show(visible)
        },
      })
      raw = result.raw
      model = result.model
      if (attempt === 1 && result.ttftMs !== null) ttftMs = result.ttftMs
    } catch (err) {
      if (invented.length > 0) {
        console.warn(
          `[ext/generate] attempt ${attempt}: unsourced figures (${invented.join(", ")}) not in post or instruction, stopped mid-stream`,
        )
        remindAboutFabrication = true
        continue
      }
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
    const unsourced = findUnsourcedNumbers(cleaned, input.numberSources)
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
      offLengthFallback ??= { text: cleaned, model }
      continue
    }

    if (cleaned.length < input.min || cleaned.length > input.max) {
      console.warn(
        `[ext/generate] attempt ${attempt}: length ${cleaned.length} outside ${input.min}-${input.max}, retrying`,
      )
      offLengthFallback ??= { text: cleaned, model }
      continue
    }

    comment = cleaned
    commentModel = model
    break
  }

  if (!comment && offLengthFallback) {
    comment = offLengthFallback.text
    commentModel = offLengthFallback.model
  }

  return { comment, model: commentModel, attempts, ttftMs, firstTextMs }
}

const GENERIC_FAILURE = "Something went wrong, try again"

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
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
  const limited = await extDailyLimitResponse(user.id)
  timer.mark("limit")
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
  timer.mark("profile")
  if (!profile) {
    return NextResponse.json({ error: "Comment profile not found" }, { status: 404 })
  }

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveExtGeneration(user.id)
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

  const input: GenerationInput = { systemMessage, userMessage, min, max, numberSources }
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

  const encoder = new TextEncoder()
  // Set once the client has gone (closed the panel mid-generation). Generation
  // still finishes and is saved, exactly as a JSON request whose caller left
  // would be; there's just nobody to send it to.
  let gone = false

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (gone) return
        try {
          controller.enqueue(encoder.encode(sse(event, data)))
        } catch {
          gone = true
        }
      }

      // Sent before the model is called, so the panel can tell "the server
      // has it" from "the model is thinking", and so any proxy in between
      // starts forwarding the stream straight away.
      send("start", { beforeModel: beforeModelMs })

      try {
        const result = await generateComment(input, {
          onText: (text) => send("text", { text }),
          onRetry: (attempt) => send("retry", { attempt }),
        })
        timer.mark("generate")

        if (!result.comment) {
          logTiming(true, result)
          await gate.release()
          send("error", { error: GENERIC_FAILURE, status: 502 })
          return
        }

        const history = await saveHistory(result)
        timer.mark("history")
        logTiming(true, result)

        // Authoritative: the panel replaces whatever it streamed with this.
        // It is usually identical; it differs when the guardrails fell back
        // to an earlier attempt's text.
        send("final", {
          comment: result.comment,
          freeRemaining: gate.freeRemaining,
          historyId: history.id,
          timing: timingSummary(result),
        })
      } catch (err) {
        console.error("[ext/generate] stream failed:", err)
        send("error", { error: GENERIC_FAILURE, status: 500 })
      } finally {
        gone = true
        try {
          controller.close()
        } catch {
          // already closed by the client going away
        }
      }
    },
    cancel() {
      gone = true
    },
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform: nothing between here and the panel may buffer or
      // compress the stream into one late chunk.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
