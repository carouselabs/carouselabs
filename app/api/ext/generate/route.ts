// ════════════════════════════════════════════════════════════════════════════
// TESTING PHASE ONLY - credit checks disabled as of 2026-09-22. MUST restore
// before public launch. See this comment in generate/route.ts, rewrite/route.ts
// and connection-note/route.ts. Reply generation has no route of its own: it goes through
// this one (body.reply), so the same skipped check covers it. The switch is
// COMMENT_CREDITS_ENFORCED in lib/commentCredits.ts; both the balance check and
// the charge below are skipped while it is false, not removed.
// ════════════════════════════════════════════════════════════════════════════
// app/api/ext/generate/route.ts — the Comment extension's core Generate flow.
// Bearer-token authenticated, same as the rest of app/api/ext/* (see
// lib/extensionCommentAuth.ts).
//
// Credit handling is deliberately ordered: balance is checked BEFORE any model
// call, but the charge only lands after a generation survives validation. A
// request that fails after its automatic retry is never charged and writes no
// CommentHistory row, so a user is not billed for output they never saw.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { availableCredits } from "@/lib/credits"
import { chargeCreditsForAction } from "@/lib/chargeCredits"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { COMMENT_CREDITS_ENFORCED } from "@/lib/commentCredits"
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
import { callCommentModel, parseComment, sanitizeComment, CLAUDE_MODEL } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"

// Same shape as app/api/ext/rewrite. Independent of COMMENT_CREDITS_ENFORCED:
// while credits are off this is the only brake on model spend, and it stays
// useful after launch as an abuse guard. Generate and Regenerate share it,
// since both call this route.
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

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(40, "1 h"),
  analytics: false,
})

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const { success } = await ratelimit.limit(`ext:generate:${user.id}`)
  if (!success) {
    return NextResponse.json(
      { error: "Too many comments generated. Please try again later." },
      { status: 429 },
    )
  }

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

  // System profiles are shared; custom ones must belong to the caller. The
  // subscription is fetched alongside because the balance check and the later
  // charge both need it — hasGenerationBalance would re-query for the same row,
  // and chargeCreditsForAction needs the plan to decide on low-balance email.
  const [profile, subscription] = await Promise.all([
    db.commentProfile.findFirst({
      where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] },
    }),
    db.subscription.findUnique({ where: { userId: user.id } }),
  ])

  // Checked before the model call so a drained account never burns an API call.
  // TESTING PHASE ONLY: skipped while COMMENT_CREDITS_ENFORCED is false.
  if (
    COMMENT_CREDITS_ENFORCED &&
    (!subscription || availableCredits(subscription) < CREDIT_COSTS.comment_generate)
  ) {
    return NextResponse.json(
      { error: "You're out of credits.", requiresUpgrade: subscription?.plan === "FREE" },
      { status: 402 },
    )
  }

  if (!profile) {
    return NextResponse.json({ error: "Comment profile not found" }, { status: 404 })
  }

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
    // Nothing charged, no history row — the user sees an error and can retry.
    return NextResponse.json(
      { error: "Something went wrong, try again" },
      { status: 502 },
    )
  }

  // TESTING PHASE ONLY: no charge while COMMENT_CREDITS_ENFORCED is false. The
  // balance is still reported so the panel's credit figure stays accurate.
  let creditsRemaining = subscription ? availableCredits(subscription) : 0
  if (COMMENT_CREDITS_ENFORCED) {
    const charge = await chargeCreditsForAction({ ...user, subscription }, "comment_generate")
    if (!charge.ok) {
      return NextResponse.json(
        { error: "You're out of credits.", requiresUpgrade: charge.requiresUpgrade },
        { status: 402 },
      )
    }
    creditsRemaining = charge.remaining
  }

  // action stays NONE until the user actually copies or inserts the comment;
  // the id goes back to the client so it can PATCH that field when they do.
  const history = await db.commentHistory.create({
    data: {
      userId: user.id,
      profileId: profile.id,
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
      // Records what was actually charged: 0 during the free testing phase.
      creditsUsed: COMMENT_CREDITS_ENFORCED ? CREDIT_COSTS.comment_generate : 0,
      model: CLAUDE_MODEL,
    },
  })

  return NextResponse.json({
    comment,
    creditsRemaining,
    historyId: history.id,
  })
}
