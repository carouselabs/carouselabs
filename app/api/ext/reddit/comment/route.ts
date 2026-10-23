// app/api/ext/reddit/comment/route.ts — CarouseLabs Engage for Reddit's
// comment: writes a comment on a post, or a reply to a comment in its thread,
// in one of the user's Reddit profiles, streamed as it is written
// (lib/engage/commentEngine.ts, the same engine as LinkedIn's Generate and
// X's Reply: guardrails, retries, time limits, keep-alives). It reads the
// subreddit's rules and keeps to them without saying so.
//
// Token-only, like every generation route. Counts as "reddit_comments" against
// the Reddit extension's own plan (10 free generations, then its own
// $15/month), the daily cap and any admin switch or limit. Every check runs
// before the stream starts, so failures keep their JSON status.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import { recentComments } from "@/lib/engage/recentComments"
import { requestIdOf, stageTimer, streamGeneration, type GenerationInput, type GenerationResult } from "@/lib/engage/commentEngine"
import { COMMENT_AI_TELLS, WEAK_COMMENT_PATTERNS, lengthSlack, targetLengthRange } from "@/lib/ai/prompts/commentPrompt"
import {
  REDDIT_AI_TELLS,
  buildRedditCommentSystemMessage,
  buildRedditCommentUserMessage,
  redditNumberSources,
} from "@/lib/ai/prompts/redditCommentPrompt"
import { parseRedditCommentBody } from "@/lib/redditComment"
import { REDDIT_MAX_LENGTH } from "@/lib/redditText"
import { HISTORY_SNIPPET_CHARS } from "@/lib/extensionHistory"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  const timer = stageTimer()
  const requestId = requestIdOf(req)

  const user = await getUserFromCommentExtensionToken(req)
  timer.mark("auth")
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })

  const preflight = await engagePreflight(user.id, "reddit_comments", req)
  timer.mark("limit")
  if (preflight.response) return preflight.response

  const parsed = parseRedditCommentBody(await req.json().catch(() => null))
  if (!parsed.ok) {
    console.warn(`[ext/reddit/comment] rejected request: ${parsed.error}`)
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { profileId, input: comment, extraInstruction } = parsed

  // System profiles are shared; custom ones must belong to the caller. The
  // person's last few comments come alongside, so this one doesn't open or run
  // like them.
  const [profile, recent] = await Promise.all([
    db.redditProfile.findFirst({ where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] } }),
    recentComments(user.id, "reddit_comment"),
  ])
  timer.mark("profile")
  if (!profile) return NextResponse.json({ error: "Reddit profile not found" }, { status: 404 })

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveEngageGeneration(user.id, "reddit_comments", preflight)
  timer.mark("reserve")
  if (!gate.ok) return gate.response

  const range = targetLengthRange(profile.length)
  const max = Math.min(range.max, REDDIT_MAX_LENGTH)
  const min = Math.min(range.min, max)
  // What the comment answers: the comment being replied to, else the post.
  const answered = comment.replyTo ?? comment.post

  const input: GenerationInput = {
    systemMessage: buildRedditCommentSystemMessage(profile, max, comment),
    userMessage: buildRedditCommentUserMessage(comment, extraInstruction, recent),
    min,
    max,
    lengthSlack: lengthSlack(profile.length),
    numberSources: redditNumberSources(comment, extraInstruction),
    label: "ext/reddit/comment",
    engage: { userId: user.id, kind: "reddit_comments" },
    weakPatterns: [...WEAK_COMMENT_PATTERNS, ...COMMENT_AI_TELLS, ...REDDIT_AI_TELLS],
    // Its wording must not be repeated back.
    copySource: answered.text || comment.post.title,
  }
  const beforeModelMs = timer.elapsed()

  const saveHistory = (result: GenerationResult) =>
    db.commentHistory.create({
      data: {
        userId: user.id,
        kind: "reddit_comment",
        profileId: profile.id,
        profileName: profile.name,
        postAuthor: answered.author ? `u/${answered.author}` : comment.subreddit,
        postUrl: answered.url || comment.post.url,
        postSnippet: (comment.replyTo ? comment.replyTo.text : `${comment.post.title}\n\n${comment.post.text}`)
          .trim()
          .slice(0, HISTORY_SNIPPET_CHARS),
        comment: result.comment,
        action: "NONE",
        creditsUsed: 0,
        model: result.model,
      },
      select: { id: true },
    })

  const logTiming = (result: GenerationResult) => {
    const s = timer.stages
    console.log(
      `[ext/reddit/comment] timing req=${requestId ?? "-"} model=${result.model || "none"} attempts=${result.attempts}` +
        ` cancelled=${result.cancelled ? 1 : 0}` +
        ` auth=${s.auth} limit=${s.limit} profile=${s.profile} reserve=${s.reserve}` +
        ` ttft=${Math.round(result.ttftMs ?? -1)} generate=${s.generate ?? -1} total=${timer.elapsed()}`,
    )
  }

  return streamGeneration({
    input,
    beforeModelMs,
    signal: req.signal,
    onGenerated: () => timer.mark("generate"),
    onEmpty: async (result) => {
      logTiming(result)
      await gate.release()
    },
    onDone: async (result) => {
      const history = await saveHistory(result)
      logTiming(result)
      return {
        comment: result.comment,
        freeRemaining: gate.freeRemaining,
        historyId: history.id,
        length: result.comment.length,
        maxLength: max,
      }
    },
  })
}
