// app/api/ext/generate/route.ts — the Comment extension's core Generate flow.
// Bearer-token authenticated, same as the rest of app/api/ext/* (see
// lib/extensionCommentAuth.ts).
//
// Credit handling is deliberately ordered: balance is checked BEFORE any model
// call, but the charge only lands after a generation survives validation. A
// request that fails after its automatic retry is never charged and writes no
// CommentHistory row, so a user is not billed for output they never saw.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { availableCredits } from "@/lib/credits"
import { chargeCreditsForAction } from "@/lib/chargeCredits"
import { CREDIT_COSTS } from "@/lib/creditActions"
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
  targetLengthRange,
  BANNED_PHRASES,
  WEAK_COMMENT_PATTERNS,
  ANTI_FABRICATION_REMINDER,
  type CommentPostInput,
} from "@/lib/ai/prompts/commentPrompt"
import {
  callCommentModel,
  parseComment,
  sanitizeComment,
  findUnsourcedNumbers,
  CLAUDE_MODEL,
} from "@/lib/ai/commentModel"

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  let profileId: string
  let post: CommentPostInput
  let extraInstruction: string | undefined

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

    if (!profileId) throw new Error("Missing profileId")
    if (!post.text.trim()) throw new Error("Post has no text to comment on")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
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
  if (!subscription || availableCredits(subscription) < CREDIT_COSTS.comment_generate) {
    return NextResponse.json(
      { error: "You're out of credits.", requiresUpgrade: subscription?.plan === "FREE" },
      { status: 402 },
    )
  }

  if (!profile) {
    return NextResponse.json({ error: "Comment profile not found" }, { status: 404 })
  }

  const systemMessage = buildCommentSystemMessage(profile)
  const userMessage = buildCommentUserMessage(post, extraInstruction)
  const { min, max } = targetLengthRange(profile.length)

  // Everything the model is allowed to source a number from.
  const numberSources = [post.text, post.headline, post.author, extraInstruction ?? ""].join(" ")

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

  const charge = await chargeCreditsForAction({ ...user, subscription }, "comment_generate")
  if (!charge.ok) {
    return NextResponse.json(
      { error: "You're out of credits.", requiresUpgrade: charge.requiresUpgrade },
      { status: 402 },
    )
  }

  // action stays NONE until the user actually copies or inserts the comment;
  // the id goes back to the client so it can PATCH that field when they do.
  const history = await db.commentHistory.create({
    data: {
      userId: user.id,
      profileId: profile.id,
      postAuthor: post.author,
      postUrl: post.url,
      postSnippet: post.text.slice(0, 280),
      comment,
      action: "NONE",
      creditsUsed: CREDIT_COSTS.comment_generate,
      model: CLAUDE_MODEL,
    },
  })

  return NextResponse.json({
    comment,
    creditsRemaining: charge.remaining,
    historyId: history.id,
  })
}
