// app/api/ext/x/profiles/test/route.ts — the X profile builder's Test button:
// runs a draft X profile against a pasted X post, with the same prompt as a
// real X reply (lib/ai/prompts/xReplyPrompt.ts), so the preview predicts what
// Reply will write. Capped at TEST_LIMIT per saved profile, like LinkedIn's
// (app/api/ext/profiles/test); counts as "x_tests" against the one plan.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import { parseProfileInput, TEST_LIMIT } from "@/lib/commentProfiles"
import { targetLengthRange } from "@/lib/ai/prompts/commentPrompt"
import { buildXReplySystemMessage, buildXReplyUserMessage } from "@/lib/ai/prompts/xReplyPrompt"
import { callCommentModel, generationDeadline, GenerationTimeout, parseComment, sanitizeComment } from "@/lib/ai/commentModel"
import { xLengthProblem } from "@/lib/xProfiles"
import { X_MAX_LENGTH } from "@/lib/xText"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

const MAX_POST_CHARS = 4000

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })

  const preflight = await engagePreflight(user.id, "x_tests")
  if (preflight.response) return preflight.response

  const raw = (await req.json().catch(() => null)) as { profileDraft?: unknown; pastedPost?: unknown; profileId?: unknown } | null
  const pastedPost = typeof raw?.pastedPost === "string" ? raw.pastedPost.trim().slice(0, MAX_POST_CHARS) : ""
  if (!pastedPost) return NextResponse.json({ error: "Paste a post from X to test against" }, { status: 400 })

  const parsed = parseProfileInput(raw?.profileDraft)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const tooLong = xLengthProblem(parsed.value.length)
  if (tooLong) return NextResponse.json({ error: tooLong }, { status: 400 })

  // A saved profile carries its allowance; an unsaved draft is counted by the
  // form until first save (lib/commentProfiles TEST_LIMIT).
  const profileId = typeof raw?.profileId === "string" && raw.profileId ? raw.profileId : null
  let testsUsed: number | null = null
  if (profileId) {
    const existing = await db.xProfile.findFirst({
      where: { id: profileId, userId: user.id, isSystem: false },
      select: { testsUsed: true },
    })
    if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    if (existing.testsUsed >= TEST_LIMIT) {
      return NextResponse.json(
        { error: `You've used all ${TEST_LIMIT} free tests for this profile.`, testsUsed: existing.testsUsed },
        { status: 403 },
      )
    }
    testsUsed = existing.testsUsed
  }

  const settings = await db.xUserSettings.findUnique({ where: { userId: user.id }, select: { maxReplyLength: true } })
  const max = Math.min(targetLengthRange(parsed.value.length).max, settings?.maxReplyLength ?? X_MAX_LENGTH)
  const systemMessage = buildXReplySystemMessage(parsed.value, max, null)
  const userMessage = buildXReplyUserMessage({
    post: { author: "", handle: "", text: pastedPost, url: "", media: [] },
    thread: [],
    quoted: null,
    isOwnPost: null,
  })

  const gate = await reserveEngageGeneration(user.id, "x_tests", preflight)
  if (!gate.ok) return gate.response

  let comment = ""
  const deadline = generationDeadline()
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const candidate = parseComment(await callCommentModel(systemMessage, userMessage, "ext/x/profiles/test", { deadline }))
      if (!candidate?.trim()) continue
      comment = sanitizeComment(candidate).comment
      if (comment) break
    } catch (err) {
      console.error(`[ext/x/profiles/test] attempt ${attempt} failed:`, err)
      if (err instanceof GenerationTimeout) break
    }
  }

  if (!comment) {
    await gate.release()
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }

  // Counted only when the test produced something, so a failure costs nothing.
  if (profileId && testsUsed !== null) {
    testsUsed += 1
    await db.xProfile.updateMany({ where: { id: profileId, userId: user.id, isSystem: false }, data: { testsUsed } })
  }

  return NextResponse.json({ comment, testsUsed, testLimit: TEST_LIMIT, freeRemaining: gate.freeRemaining })
}
