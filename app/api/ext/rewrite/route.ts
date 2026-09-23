// ════════════════════════════════════════════════════════════════════════════
// TESTING PHASE ONLY - credit checks disabled as of 2026-09-22. MUST restore
// before public launch. See this comment in generate/route.ts, rewrite/route.ts
// and connection-note/route.ts (reply generation goes through generate/route.ts). The
// switch is COMMENT_CREDITS_ENFORCED in lib/commentCredits.ts.
//
// This route has never charged (see CREDITS below), so there is no check here
// to skip today. Restoring before launch means deciding its charge — the
// planned 0.5 credits needs the Int credit columns resolved first — and gating
// it on COMMENT_CREDITS_ENFORCED like generate/route.ts. The 40/hour rate
// limit below is independent of the flag and stays active.
// ════════════════════════════════════════════════════════════════════════════
// app/api/ext/rewrite/route.ts — the Shorter / Longer buttons. Takes a comment
// that already exists and resizes it, rather than generating a new one, so the
// specific detail and the voice that made the original work survive.
//
// CREDITS: currently free. The spec calls for 0.5 credits, but
// Subscription.creditsUsed / creditsTotal / extraCredits are Int columns, so a
// fractional deduction would be silently rounded. Charging is deferred rather
// than made wrong; see CREDIT_COSTS.comment_rewrite. Because that leaves an
// unmetered model call, this route carries its own rate limit — the same shape
// app/api/generate/image-prompt uses for exactly that reason.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import {
  buildRewriteSystemMessage,
  buildRewriteUserMessage,
  rewriteBounds,
  countSentences,
  WEAK_COMMENT_PATTERNS,
} from "@/lib/ai/prompts/commentPrompt"
import { callCommentModel, parseComment, sanitizeComment } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(40, "1 h"),
  analytics: false,
})

const MAX_COMMENT_CHARS = 4000

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const { success } = await ratelimit.limit(`ext:rewrite:${user.id}`)
  if (!success) {
    return NextResponse.json(
      { error: "Too many rewrites. Please try again later." },
      { status: 429 },
    )
  }

  let currentComment: string
  let direction: "shorter" | "longer"
  // Optional: the CommentHistory row this comment came from, so the stored
  // text can be kept in step with what the user will actually copy. Absent
  // when the comment has no history row behind it.
  let historyId: string | undefined

  try {
    const body = await req.json()

    if (typeof body.currentComment !== "string" || !body.currentComment.trim()) {
      throw new Error("Missing currentComment")
    }
    if (body.direction !== "shorter" && body.direction !== "longer") {
      throw new Error('direction must be "shorter" or "longer"')
    }

    currentComment = body.currentComment.trim().slice(0, MAX_COMMENT_CHARS)
    direction = body.direction
    historyId = typeof body.historyId === "string" && body.historyId ? body.historyId : undefined
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const systemMessage = buildRewriteSystemMessage(direction, currentComment.length, countSentences(currentComment))
  const userMessage = buildRewriteUserMessage(currentComment)
  const { limit } = rewriteBounds(currentComment.length, direction)

  // Held in case the retry errors outright: a weakly-resized comment still
  // beats failing a cosmetic operation.
  let undersizedFallback = ""

  // Single success path, so the history sync below cannot be skipped by one
  // branch returning early.
  let finalComment = ""

  // Two attempts. The bar: it parsed, survived sanitising, invented no new
  // figures, carries no generic-AI tells, and actually moved in the requested
  // direction — a "Shorter" that returns the same length is a dead button.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let raw: string
    try {
      raw = await callCommentModel(systemMessage, userMessage, "ext/rewrite")
    } catch (err) {
      console.error(`[ext/rewrite] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const parsed = parseComment(raw)
    if (!parsed?.trim()) {
      console.warn(`[ext/rewrite] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const { comment } = sanitizeComment(parsed)
    if (!comment) continue

    // The original comment is the only source a rewrite may draw numbers from:
    // resizing must not introduce a statistic the user never wrote.
    const unsourced = findUnsourcedNumbers(comment, currentComment)
    if (unsourced.length > 0) {
      console.warn(
        `[ext/rewrite] attempt ${attempt}: rewrite invented figures (${unsourced.join(", ")}), discarding`,
      )
      continue
    }

    // Same tells the generate route rejects. Without this, Longer could
    // reintroduce a cliché ("at scale") that Generate would have blocked.
    const weak = WEAK_COMMENT_PATTERNS.filter(({ pattern }) => pattern.test(comment))
    if (weak.length > 0 && attempt === 1) {
      console.warn(
        `[ext/rewrite] attempt ${attempt}: weak patterns (${weak.map((w) => w.label).join(", ")}), retrying`,
      )
      continue
    }

    // Did it actually resize? A rewrite that lands the wrong side of the
    // bound has ignored the instruction, which reads to the user as a button
    // that does nothing.
    const moved =
      direction === "shorter" ? comment.length <= limit : comment.length >= limit
    if (!moved) {
      console.warn(
        `[ext/rewrite] attempt ${attempt}: ${comment.length} chars vs ${currentComment.length} original, did not clear the ${direction} bound of ${limit}`,
      )
      if (!undersizedFallback) undersizedFallback = comment
      continue
    }

    finalComment = comment
    break
  }

  if (!finalComment) finalComment = undersizedFallback

  if (!finalComment) {
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }

  // Keep the history row in step with what the user will copy. Without this
  // the row keeps the originally generated text, so a comment that was
  // shortened before copying would not match its own history entry.
  //
  // Scoped by userId as well as id, so a valid token cannot overwrite another
  // user's row. Best effort: the rewrite itself already succeeded, and failing
  // the request over a bookkeeping write would lose the user their comment.
  if (historyId) {
    try {
      const result = await db.commentHistory.updateMany({
        where: { id: historyId, userId: user.id },
        data: { comment: finalComment },
      })
      if (result.count === 0) {
        console.warn(`[ext/rewrite] history row ${historyId} not found for this user, not synced`)
      }
    } catch (err) {
      console.error("[ext/rewrite] history sync failed:", err)
    }
  }

  return NextResponse.json({ comment: finalComment })
}
