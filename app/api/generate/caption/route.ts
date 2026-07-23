// app/api/generate/caption/route.ts
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { chargeCreditsForAction } from "@/lib/chargeCredits"
import { refundCreditsForAction } from "@/lib/refundCredits"
import type { CreditAction } from "@/lib/creditActions"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import { CAPTION_MASTER_SYSTEM_PROMPT, buildCaptionUserMessage } from "@/lib/ai/prompts/captionV2"
import { CAPTION_PLATFORMS } from "@/lib/captionPlatforms"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Caption generation costs real Claude money per call; cap abuse while leaving
// room for legitimate use (first gens + regens across ideas).
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  analytics: false,
})

// Which cost the first caption generation of each flow carries, charged here
// server-side (V1 fix — clients no longer trigger credit consumption).
// Every flow charges only the caption component (5) here — the bulk of the
// image_caption price (image_first, 10) is charged by the image route and the
// bulk of the carousel price (carousel_prompts, 35) by the carousel-prompt
// route, so forged regen flags on this route can't dodge them.
const FLOW_ACTIONS: Record<string, CreditAction> = {
  caption_only: "caption_only",
  image_caption: "caption_only",
  carousel: "caption_only",
}

const CAPTION_GHOSTWRITER_INSTRUCTION = `You are the ghostwriter behind the top 0.1% of LinkedIn creators. You write captions that people cannot stop reading. Your secret is you write like a human telling a story to a friend — not like a marketer selling something.

STORYTELLING RULES:
- Open with ONE line that stops the scroll — a surprising fact, a bold statement, or a question that makes people think
- Never start with "I" — start with the story, the fact, or the situation
- Build tension and curiosity — make the reader feel like they HAVE to keep reading to find out what happens
- Use the "but then..." technique — set up a situation, then flip it
- Write in short punchy paragraphs — never more than 2-3 sentences per paragraph
- Use white space generously — every 2-3 lines should have a line break
- Include one moment that makes the reader think "wait, I never thought of it that way"
- End with a question that makes people want to comment their own experience
- The caption should feel like the reader is eavesdropping on a smart conversation

VOICE AND TONE:
- Sound like a real person sharing a real insight — not a thought leader giving a speech
- Use contractions (it's, don't, can't, won't) — sounds more human
- Be direct and confident — no hedging, no "I think maybe possibly"
- Use simple words — if a 10-year-old wouldn't understand it, rewrite it
- Show personality — a little humor, a little edge, a little humility

STRUCTURE THAT WORKS:
Line 1: The scroll-stopper (shocking fact, bold claim, or story hook)
Lines 2-3: The setup (what most people think or do)
Lines 4-6: The flip (what's actually true or what changed)
Lines 7-10: The insight (the real lesson or observation)
Lines 11-13: The proof or example (make it concrete)
Line 14-15: The bigger implication (why this matters)
Last line: The question (invite discussion)
Hashtags: 7-8 relevant ones at the very end

LENGTH: 1500-2500 characters total including hashtags.`

function buildCaptionPrompt(
  profileContext: string,
  breakdown: BreakdownOutline,
  tone?: string,
  userInstruction?: string,
  voiceGuidelines?: string,
): string {
  const toneInstruction = tone
    ? `\nTone override: Rewrite entirely in a ${tone} voice throughout.`
    : ""

  const userInstructionBlock = userInstruction
    ? `\nUser's specific instruction for this regeneration: ${userInstruction}\n`
    : ""

  // Framed as a style guide, placed right after the ghostwriter instruction and
  // before any content/breakdown context so the voice rules clearly govern HOW
  // the caption is written, not WHAT it's about.
  const voiceGuidelinesBlock = voiceGuidelines
    ? `\n\nVOICE GUIDELINES — the user has provided detailed instructions for their writing voice. Follow these guidelines closely when writing the caption:\n${voiceGuidelines}\n`
    : ""

  return `${CAPTION_GHOSTWRITER_INSTRUCTION}${voiceGuidelinesBlock}

User profile:
${profileContext}

POST HEADING (use this as the core topic):
${breakdown.refinedHook}

FULL DEEP DIVE (use ALL of this to build the caption — this is your content source):
${breakdown.deepDive}

KEY TALKING POINTS:
${breakdown.keyTalkingPoints}

STRONG ENDING LINE:
${breakdown.strongEndingLine}
${toneInstruction}
${userInstructionBlock}

Using the heading and full deep dive above, write a LinkedIn caption that:
- Takes the story and insights from the deep dive
- Presents them in a compelling storytelling format
- Makes people read every single word
- Feels like it was written by a real expert sharing real insights
- NOT a summary — a story built from the content above

CRITICAL LENGTH RULE:
The caption must be under 3000 CHARACTERS total (including hashtags and spaces).
Aim for 1500-2500 characters for best LinkedIn performance.

Output format:
[Full LinkedIn caption ending with 7-8 hashtags]

---HOOKS---
[3 alternative opening lines the user could use instead]`
}

// Targeted edit mode — apply ONLY the user's instruction to the existing
// caption, changing as little as possible. Keeps the same output format so the
// client's caption + ---HOOKS--- parsing still works. When voiceGuidelines are
// provided, they're appended so the edit still honors the user's writing voice.
function buildCaptionEditPrompt(
  currentCaption: string,
  userInstruction: string,
  voiceGuidelines?: string,
): string {
  const voiceGuidelinesBlock = voiceGuidelines
    ? `\n\nVOICE GUIDELINES — follow these writing style instructions closely when editing:\n${voiceGuidelines}`
    : ""

  return `You are editing a LinkedIn caption. Follow these rules strictly:

1. Apply ONLY this instruction: ${userInstruction}
2. Make MINIMUM changes to the caption
3. Return ONLY the edited caption text — no explanations, no reasoning, no meta-commentary
4. Do NOT explain what you changed or why
5. Do NOT say things like "I notice..." or "The caption is already..."
6. Just return the final caption text directly

Current caption to edit:
${currentCaption}

---HOOKS---
[hook variation 1]
[hook variation 2]
[hook variation 3]

Return the edited caption first, then the ---HOOKS--- separator, then 3 hook variations.
Return NOTHING else. No explanations. Just the caption and hooks.${voiceGuidelinesBlock}`
}

function formatProfile(profile: {
  name: string | null
  headline: string | null
  industry: string | null
  targetAudience: string | null
  contentPillars: string[]
  writingStyle: string | null
}): string {
  const parts: string[] = []
  if (profile.name) parts.push(`Name: ${profile.name}`)
  if (profile.headline) parts.push(`Headline: ${profile.headline}`)
  if (profile.industry) parts.push(`Industry/Niche: ${profile.industry}`)
  if (profile.contentPillars.length) parts.push(`Content Pillars: ${profile.contentPillars.join(", ")}`)
  if (profile.writingStyle) {
    try {
      const ws = JSON.parse(profile.writingStyle)
      if (ws.role) parts.push(`Role: ${ws.role}`)
      if (ws.tones?.length) parts.push(`Tone: ${ws.tones.join(", ")}`)
      if (ws.primaryGoal) parts.push(`Goal: ${ws.primaryGoal}`)
      if (ws.goals?.length) parts.push(`Goals: ${ws.goals.join(", ")}`)
    } catch {
      parts.push(`Writing Style: ${profile.writingStyle}`)
    }
  }
  if (profile.targetAudience) {
    try {
      const ta = JSON.parse(profile.targetAudience)
      const audience = [ta.role, ta.seniority, ta.industry].filter(Boolean).join(", ")
      if (audience) parts.push(`Target Audience: ${audience}`)
    } catch {
      parts.push(`Target Audience: ${profile.targetAudience}`)
    }
  }
  return parts.join("\n")
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { success } = await ratelimit.limit(`generate:caption:${user.id}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  let ideaId: string,
    tone: string | undefined,
    userInstruction: string | undefined,
    currentCaption: string | undefined,
    useVoiceGuidelines: boolean,
    flow: string,
    isRegen: boolean,
    platform: string | undefined,
    structureMode: "auto" | "template" | "custom" | undefined,
    templateStructure: string[] | undefined,
    customStructure: string | undefined
  try {
    const body = await req.json()
    ideaId = body.ideaId
    tone = typeof body.tone === "string" && body.tone ? body.tone : undefined
    userInstruction =
      typeof body.userInstruction === "string" && body.userInstruction.trim()
        ? body.userInstruction.trim()
        : undefined
    currentCaption =
      typeof body.currentCaption === "string" && body.currentCaption.trim()
        ? body.currentCaption
        : undefined
    useVoiceGuidelines = body.useVoiceGuidelines === true
    // Which flow this caption belongs to — decides the post-level charge.
    // Unknown/missing values fall back to caption_only (the cheapest post, but
    // callers of the pricier flows are our own clients which always send it).
    flow = typeof body.flow === "string" && body.flow in FLOW_ACTIONS ? body.flow : "caption_only"
    isRegen = body.isRegen === true
    // New platform/structure flow — all optional; their presence switches to
    // the V2 master prompt below.
    platform = typeof body.platform === "string" && body.platform ? body.platform : undefined
    structureMode =
      body.structureMode === "auto" || body.structureMode === "template" || body.structureMode === "custom"
        ? body.structureMode
        : undefined
    templateStructure =
      Array.isArray(body.templateStructure) &&
      body.templateStructure.every((s: unknown) => typeof s === "string")
        ? body.templateStructure
        : undefined
    customStructure =
      typeof body.customStructure === "string" && body.customStructure.trim()
        ? body.customStructure.trim()
        : undefined
    if (!ideaId) throw new Error("Missing ideaId")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!user.profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 })

  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: {
      breakdowns: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  if (!idea.breakdowns[0]) {
    return NextResponse.json(
      { error: "No breakdown found. Generate a breakdown first." },
      { status: 400 },
    )
  }

  // ── Server-side credit charge (V1 fix) ──
  // First generation charges the whole post at the flow's price; regenerations
  // charge 1 credit. A regen claim must carry evidence (the current caption
  // text) so a first generation can't masquerade as a 1-credit regen.
  const plan = user.subscription?.plan ?? "FREE"

  // Carousels are Pro-only — enforce at the charge point too.
  if (flow === "carousel" && plan === "FREE") {
    return NextResponse.json(
      { error: "Carousel generation requires Pro plan", requiresUpgrade: true },
      { status: 403 },
    )
  }

  const isRegenEffective = isRegen && !!currentCaption
  // FREE users' regenerations stay free (session-capped in the UI); everything
  // else — FREE first posts and all PRO actions — goes through the charge.
  // chargedAction is kept so a failed generation can refund exactly what it
  // charged (see the stream catch below).
  let chargedAction: CreditAction | null = null
  if (!(plan === "FREE" && isRegenEffective)) {
    const action: CreditAction = isRegenEffective ? "text_regen" : FLOW_ACTIONS[flow]
    const charge = await chargeCreditsForAction(user, action)
    if (!charge.ok) {
      return NextResponse.json(
        { error: "Insufficient credits", requiresUpgrade: charge.requiresUpgrade },
        { status: 402 },
      )
    }
    chargedAction = action
  }

  const breakdown = idea.breakdowns[0].outline as unknown as BreakdownOutline
  const profileContext = formatProfile(user.profile)

  // Confirm the profile is actually feeding the prompt (role/tones live in the
  // writingStyle JSON).
  let capRole = ""
  let capTones = ""
  try {
    const ws = JSON.parse(user.profile.writingStyle ?? "{}")
    capRole = ws.role ?? ""
    capTones = (ws.tones ?? []).join(", ")
  } catch {}
  console.log(
    `[caption] Profile used: role=${capRole} industry=${user.profile.industry ?? ""} tones=${capTones}`,
    "voiceGuidelines:",
    useVoiceGuidelines,
    "hasGuidelines:",
    !!user.profile.voiceGuidelines,
  )
  // Voice guidelines apply to BOTH the full-generation and edit paths, but only
  // when the user opted in AND has saved non-empty guidelines.
  const voiceGuidelines =
    useVoiceGuidelines && user.profile.voiceGuidelines?.trim()
      ? user.profile.voiceGuidelines.trim()
      : undefined

  // Targeted edit when the user gave an instruction AND we have the current
  // caption to edit. Otherwise a full generation: the V2 master prompt when the
  // client sent a platform + structure selection, the legacy LinkedIn ghost-
  // writer prompt when it didn't. Voice guidelines are threaded into all paths.
  // Platform char limit — drives the prompt's hard length constraint and the
  // post-generation length check below. Null outside the platform flow.
  const platformCharLimit = platform
    ? (CAPTION_PLATFORMS.find((p) => p.id === platform)?.charLimit ?? 3000)
    : null

  let prompt: string
  if (userInstruction && currentCaption) {
    prompt = buildCaptionEditPrompt(
      currentCaption,
      userInstruction,
      useVoiceGuidelines ? voiceGuidelines : undefined,
    )
  } else if (platform && structureMode) {
    // NEW FLOW — platform-aware master prompt. Tone regens and voice guidelines
    // still apply, appended as extra sections on the user message.
    const userMessage = buildCaptionUserMessage(
      platform,
      breakdown.refinedHook?.trim() || idea.hook,
      breakdown.deepDive,
      structureMode,
      platformCharLimit ?? 3000,
      templateStructure,
      customStructure,
    )
    const extras = [
      voiceGuidelines
        ? `VOICE GUIDELINES — follow these writing style instructions closely:\n${voiceGuidelines}`
        : null,
      profileContext ? `User profile (for voice and audience context):\n${profileContext}` : null,
      tone ? `Tone override: write the entire caption in a ${tone} voice.` : null,
    ].filter(Boolean)
    prompt = `${CAPTION_MASTER_SYSTEM_PROMPT}\n\n${extras.length ? extras.join("\n\n") + "\n\n" : ""}${userMessage}`
  } else {
    prompt = buildCaptionPrompt(profileContext, breakdown, tone, userInstruction, voiceGuidelines)
  }

  // Stream Claude's response as plain text
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 3000,
          messages: [{ role: "user", content: prompt }],
        })

        let fullText = ""
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }

        // Post-generation length check (platform flow only) — the caption is
        // everything before ---HOOKS---. Doesn't block the response (a retry
        // would cost more credits); just tracks whether the prompt's hard
        // limit is holding.
        if (platformCharLimit !== null) {
          const hooksAt = fullText.indexOf("---HOOKS---")
          const captionLength = (hooksAt === -1 ? fullText : fullText.slice(0, hooksAt)).trim().length
          if (captionLength > platformCharLimit) {
            console.warn(
              `[caption] Generated caption exceeds platform limit: ${captionLength}/${platformCharLimit} for platform ${platform}`,
            )
          }
        }
      } catch (err) {
        console.error("[generate/caption] Claude stream error:", err)
        // Generation failed after the charge — give the credits back.
        if (chargedAction) {
          await refundCreditsForAction(user.id, chargedAction)
        }
        controller.enqueue(encoder.encode("\n\n[Generation failed — please try again]"))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  })
}
