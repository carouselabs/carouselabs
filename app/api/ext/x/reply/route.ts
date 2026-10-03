// app/api/ext/x/reply/route.ts — CarouseLabs Engage for X's Reply: writes a
// reply to a post on X, in one of the user's X profiles, streamed as it is
// written (lib/engage/commentEngine.ts, the same engine as LinkedIn's
// Generate: guardrails, retries, time limits, keep-alives).
//
// Token-only, like every generation route. Counts as "x_replies" against the
// account's one plan (10 free generations, then $15/month, shared with the
// LinkedIn extension), the daily cap and any admin switch or limit. Every
// check runs before the stream starts, so failures keep their JSON status.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import { stageTimer, streamGeneration, type GenerationInput, type GenerationResult } from "@/lib/engage/commentEngine"
import { targetLengthRange } from "@/lib/ai/prompts/commentPrompt"
import { buildXReplySystemMessage, buildXReplyUserMessage, xNumberSources } from "@/lib/ai/prompts/xReplyPrompt"
import { parseReplyBody } from "@/lib/xReply"
import { xLength, X_MAX_LENGTH } from "@/lib/xText"
import { HISTORY_SNIPPET_CHARS } from "@/lib/extensionHistory"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  const timer = stageTimer()

  const user = await getUserFromCommentExtensionToken(req)
  timer.mark("auth")
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })

  const preflight = await engagePreflight(user.id, "x_replies", req)
  timer.mark("limit")
  if (preflight.response) return preflight.response

  const parsed = parseReplyBody(await req.json().catch(() => null))
  if (!parsed.ok) {
    console.warn(`[ext/x/reply] rejected request: ${parsed.error}`)
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const { profileId, input: reply, extraInstruction } = parsed

  // System profiles are shared; custom ones must belong to the caller.
  const [profile, settings] = await Promise.all([
    db.xProfile.findFirst({ where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] } }),
    db.xUserSettings.findUnique({ where: { userId: user.id }, select: { maxReplyLength: true } }),
  ])
  timer.mark("profile")
  if (!profile) return NextResponse.json({ error: "X profile not found" }, { status: 404 })

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveEngageGeneration(user.id, "x_replies", preflight)
  timer.mark("reserve")
  if (!gate.ok) return gate.response

  // The profile's range, never past what the account can post.
  const maxLength = settings?.maxReplyLength ?? X_MAX_LENGTH
  const range = targetLengthRange(profile.length)
  const max = Math.min(range.max, maxLength)
  const min = Math.min(range.min, max)

  const input: GenerationInput = {
    systemMessage: buildXReplySystemMessage(profile, max, reply.isOwnPost),
    userMessage: buildXReplyUserMessage(reply, extraInstruction),
    min,
    max,
    numberSources: xNumberSources(reply, extraInstruction),
    label: "ext/x/reply",
    measure: xLength,
    engage: { userId: user.id, kind: "x_replies" },
  }
  const beforeModelMs = timer.elapsed()

  const saveHistory = (result: GenerationResult) =>
    db.commentHistory.create({
      data: {
        userId: user.id,
        kind: "x_reply",
        profileId: profile.id,
        profileName: profile.name,
        postAuthor: reply.post.author || (reply.post.handle ? `@${reply.post.handle}` : ""),
        postUrl: reply.post.url,
        postSnippet: (reply.post.text || "(media only)").slice(0, HISTORY_SNIPPET_CHARS),
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
      `[ext/x/reply] timing model=${result.model || "none"} attempts=${result.attempts}` +
        ` auth=${s.auth} limit=${s.limit} profile=${s.profile} reserve=${s.reserve}` +
        ` ttft=${Math.round(result.ttftMs ?? -1)} generate=${s.generate ?? -1} total=${timer.elapsed()}`,
    )
  }

  return streamGeneration({
    input,
    beforeModelMs,
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
        length: xLength(result.comment),
        maxLength,
      }
    },
  })
}
