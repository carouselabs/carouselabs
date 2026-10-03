// lib/engage/rewriteRoute.ts — Shorter / Longer, shared by both extensions:
// LinkedIn (app/api/ext/rewrite) and CarouseLabs Engage for X
// (app/api/ext/x/rewrite). Moved here unchanged from the LinkedIn route, plus
// what differs on X: the usage kind, X's length count and X's ceiling.
// (From app/api/ext/rewrite/route.ts — the Shorter / Longer buttons.) Takes a comment
// that already exists and resizes it, rather than generating a new one, so the
// specific detail and the voice that made the original work survive.
//
// Access: a rewrite is a model call like any other, so it goes through the
// same extension access gate (lib/extAccess.ts) and shared daily limit as
// generate/route.ts.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import {
  buildRewriteSystemMessage,
  buildRewriteUserMessage,
  rewriteBounds,
  countSentences,
  WEAK_COMMENT_PATTERNS,
} from "@/lib/ai/prompts/commentPrompt"
import { callCommentModel, generationDeadline, GenerationTimeout, parseComment, sanitizeComment } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"
import { xLength, X_MAX_LENGTH } from "@/lib/xText"

const MAX_COMMENT_CHARS = 4000

export type RewritePlatform = "linkedin" | "x"

// Shorter / Longer for both extensions. X's (app/api/ext/x/rewrite) differs
// in what is counted ("x_rewrites"), how length is measured (X's own count),
// and a ceiling: a Longer X reply must still fit the account's limit.
export async function handleRewriteRequest(req: Request, platform: RewritePlatform): Promise<Response> {
  const isX = platform === "x"
  const label = isX ? "ext/x/rewrite" : "ext/rewrite"
  const usage = isX ? "x_rewrites" : "rewrites"
  const measure = isX ? xLength : (text: string) => text.length

  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const preflight = await engagePreflight(user.id, usage, req)
  if (preflight.response) return preflight.response

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

  // X: the account's reply limit (280, more with X Premium).
  const maxLength = isX
    ? ((await db.xUserSettings.findUnique({ where: { userId: user.id }, select: { maxReplyLength: true } }))?.maxReplyLength ??
      X_MAX_LENGTH)
    : Infinity
  const currentLength = measure(currentComment)
  const systemMessage = buildRewriteSystemMessage(
    direction,
    currentLength,
    countSentences(currentComment),
    isX ? { maxLength } : undefined,
  )
  const userMessage = buildRewriteUserMessage(currentComment)
  const { limit } = rewriteBounds(currentLength, direction)

  const gate = await reserveEngageGeneration(user.id, usage, preflight)
  if (!gate.ok) return gate.response

  // Held in case the retry errors outright: a weakly-resized comment still
  // beats failing a cosmetic operation.
  let undersizedFallback = ""

  // Single success path, so the history sync below cannot be skipped by one
  // branch returning early.
  let finalComment = ""

  // Two attempts. The bar: it parsed, survived sanitising, invented no new
  // figures, carries no generic-AI tells, and actually moved in the requested
  // direction — a "Shorter" that returns the same length is a dead button.
  const deadline = generationDeadline()
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let raw: string
    try {
      raw = await callCommentModel(systemMessage, userMessage, label, { deadline })
    } catch (err) {
      if (err instanceof GenerationTimeout) {
        console.error(`[${label}] attempt ${attempt}: out of time, giving up`)
        break
      }
      console.error(`[${label}] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const parsed = parseComment(raw)
    if (!parsed?.trim()) {
      console.warn(`[${label}] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const { comment } = sanitizeComment(parsed)
    if (!comment) continue

    // The original comment is the only source a rewrite may draw numbers from:
    // resizing must not introduce a statistic the user never wrote.
    const unsourced = findUnsourcedNumbers(comment, currentComment)
    if (unsourced.length > 0) {
      console.warn(
        `[${label}] attempt ${attempt}: rewrite invented figures (${unsourced.join(", ")}), discarding`,
      )
      continue
    }

    // Same tells the generate route rejects. Without this, Longer could
    // reintroduce a cliché ("at scale") that Generate would have blocked.
    const weak = WEAK_COMMENT_PATTERNS.filter(({ pattern }) => pattern.test(comment))
    if (weak.length > 0 && attempt === 1) {
      console.warn(
        `[${label}] attempt ${attempt}: weak patterns (${weak.map((w) => w.label).join(", ")}), retrying`,
      )
      continue
    }

    // Did it actually resize? A rewrite that lands the wrong side of the
    // bound has ignored the instruction, which reads to the user as a button
    // that does nothing.
    const length = measure(comment)
    // On X, never past what the account can post, even when asked for Longer.
    if (length > maxLength) {
      console.warn(`[${label}] attempt ${attempt}: ${length} chars, over the ${maxLength} limit`)
      continue
    }
    // A Longer that can't grow (the original is already near the limit) is
    // judged against the room there is.
    const moved = direction === "shorter" ? length <= limit : length >= Math.min(limit, maxLength)
    if (!moved) {
      console.warn(
        `[${label}] attempt ${attempt}: ${length} chars vs ${currentLength} original, did not clear the ${direction} bound of ${limit}`,
      )
      if (!undersizedFallback) undersizedFallback = comment
      continue
    }

    finalComment = comment
    break
  }

  if (!finalComment) finalComment = undersizedFallback

  if (!finalComment) {
    await gate.release()
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
        console.warn(`[${label}] history row ${historyId} not found for this user, not synced`)
      }
    } catch (err) {
      console.error(`[${label}] history sync failed:`, err)
    }
  }

  return NextResponse.json({ comment: finalComment, freeRemaining: gate.freeRemaining })
}
