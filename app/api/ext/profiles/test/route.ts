// app/api/ext/profiles/test/route.ts — the profile builder's free Test button.
// Runs an in-progress draft against a pasted post so the user can hear the
// voice before saving.
//
// Uses the SAME buildCommentSystemMessage / buildCommentUserMessage as
// app/api/ext/generate, deliberately: a preview built from a near-copy of the
// real prompt would drift and stop predicting what Generate actually produces.
//
// Capped at TEST_LIMIT per profile, and like every other extension model call
// it goes through the access gate (lib/extAccess.ts: a free user's Test uses
// one of their free generations) and the shared daily generation limit.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import { parseProfileInput, TEST_LIMIT } from "@/lib/commentProfiles"
import {
  buildCommentSystemMessage,
  buildCommentUserMessage,
} from "@/lib/ai/prompts/commentPrompt"
import {
  callCommentModel,
  generationDeadline,
  GenerationTimeout,
  parseComment,
  sanitizeComment,
} from "@/lib/ai/commentModel"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

const MAX_POST_CHARS = 6000

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const preflight = await engagePreflight(user.id, "tests", req)
  if (preflight.response) return preflight.response

  const body = await req.json().catch(() => null)
  const raw = body as { profileDraft?: unknown; pastedPost?: unknown; profileId?: unknown } | null

  const pastedPost =
    typeof raw?.pastedPost === "string" ? raw.pastedPost.trim().slice(0, MAX_POST_CHARS) : ""
  if (!pastedPost) {
    return NextResponse.json({ error: "Paste a sample post to test against" }, { status: 400 })
  }

  const parsed = parseProfileInput(raw?.profileDraft)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  // A saved profile carries its allowance in the database. A brand-new draft
  // has no row yet, so the form tracks its own count until first save — see
  // TEST_LIMIT in lib/commentProfiles.
  const profileId = typeof raw?.profileId === "string" && raw.profileId ? raw.profileId : null
  let testsUsed: number | null = null

  if (profileId) {
    const existing = await db.commentProfile.findFirst({
      where: { id: profileId, userId: user.id, isSystem: false },
      select: { id: true, testsUsed: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
    if (existing.testsUsed >= TEST_LIMIT) {
      return NextResponse.json(
        { error: `You've used all ${TEST_LIMIT} free tests for this profile.`, testsUsed: existing.testsUsed },
        { status: 403 },
      )
    }
    testsUsed = existing.testsUsed
  }

  const systemMessage = buildCommentSystemMessage(parsed.value)
  // A pasted post has no author or headline, so only the text is populated.
  const userMessage = buildCommentUserMessage({
    author: "",
    headline: "",
    text: pastedPost,
    type: "text",
    url: "",
  })

  const gate = await reserveEngageGeneration(user.id, "tests", preflight)
  if (!gate.ok) return gate.response

  let comment = ""
  const deadline = generationDeadline()
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const modelRaw = await callCommentModel(systemMessage, userMessage, "ext/profiles/test", {
        deadline,
        engage: { userId: user.id, kind: "tests" },
      })
      const candidate = parseComment(modelRaw)
      if (!candidate?.trim()) continue
      comment = sanitizeComment(candidate).comment
      if (comment) break
    } catch (err) {
      console.error(`[ext/profiles/test] attempt ${attempt} failed:`, err)
      if (err instanceof GenerationTimeout) break
    }
  }

  if (!comment) {
    await gate.release()
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }

  // Counted only on a test that actually produced output, so a failed attempt
  // does not eat one of the three.
  if (profileId && testsUsed !== null) {
    testsUsed += 1
    await db.commentProfile.updateMany({
      where: { id: profileId, userId: user.id, isSystem: false },
      data: { testsUsed },
    })
  }

  return NextResponse.json({ comment, testsUsed, testLimit: TEST_LIMIT, freeRemaining: gate.freeRemaining })
}
