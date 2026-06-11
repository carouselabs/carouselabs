// app/api/generate/caption/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import type { BreakdownOutline } from "@/lib/types/breakdown"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CAPTION_GHOSTWRITER_INSTRUCTION = `Act as a top 0.1% LinkedIn ghostwriter for AI founders. Read the deep dive and identify every unique insight, strategic implication, supporting argument, and founder perspective. Rewrite it into a LinkedIn post that preserves all high-value information while removing fluff, repetition, and unnecessary exposition. Optimize for readability, engagement, and authority—not virality or clickbait. The writing should feel human, opinionated, and experience-driven, with natural transitions and varied sentence lengths. The first three lines should create curiosity without hiding the value, and the rest should progressively reveal deeper insights. Prioritize clarity over hype, include practical takeaways, and end with a question that invites thoughtful discussion rather than generic comments. If any important idea from the original is omitted, explicitly add it back so that no meaningful strategic insight is lost. The final post should sound like an experienced founder or investor sharing hard-earned lessons, not an AI summarizing an article.

READABILITY RULES:
- Write at a 8th grade reading level — simple words, short sentences
- No jargon, buzzwords, or corporate speak
- Every sentence must be immediately understandable by a non-expert
-
- Use simple words: 'use' not 'utilize', 'help' not 'facilitate', 'show' not 'demonstrate'
- If a normal person can't understand a sentence in 3 seconds, rewrite it
- The caption must be so clear that someone who knows nothing about the topic instantly understands what the post is about just from reading the first 3 lines`

function buildCaptionPrompt(
  profileContext: string,
  idea: { hook: string; category: string },
  breakdown: BreakdownOutline,
  tone?: string,
  userInstruction?: string,
): string {
  const toneInstruction = tone
    ? `\nTone override: Rewrite entirely in a ${tone} voice throughout.`
    : ""

  const userInstructionBlock = userInstruction
    ? `\nUser's specific instruction for this regeneration: ${userInstruction}\n`
    : ""

  return `${CAPTION_GHOSTWRITER_INSTRUCTION}

${profileContext}

Selected LinkedIn post idea:
Category: ${idea.category}
Hook: "${idea.hook}"

Post breakdown:
Refined Hook: ${breakdown.refinedHook}
Post Objective: ${breakdown.postObjective}
Target Emotion: ${breakdown.targetEmotion}
Recommended Structure: ${breakdown.recommendedStructure}
Key Talking Points: ${breakdown.keyTalkingPoints}
Storytelling Angle: ${breakdown.storytellingAngle}
Suggested CTA: ${breakdown.suggestedCTA}
Strong Ending Line: ${breakdown.strongEndingLine}
${toneInstruction}
${userInstructionBlock}
Generate a high-performing LinkedIn caption optimized for more views, likes, comments, higher retention, and profile visits.

The caption must:
- Start with the refined hook above as the very first line
- Use short readable paragraphs (1-3 sentences max per paragraph)
- Follow the recommended structure
- Cover the key talking points naturally
- Trigger curiosity, emotion, relatability, or debate
- Match the user's personal brand and tone
- End with the suggested CTA
- At the very end of the caption, after the CTA, add a blank line then include 7-8 relevant niche-specific hashtags directly in the caption text like this: #AITools #LinkedInGrowth #ContentMarketing etc. These hashtags should be relevant to the post topic and the user's niche.
- Feel human and platform-native
- Avoid generic AI-style writing or filler phrases

After the caption, output exactly this delimiter on its own line:
---HOOKS---
Then write 3 alternative opening hook lines, one per line. Each should be distinctly different in angle or style from the others and from the caption's opening line.

Output format (follow exactly):
[full caption text ending with hashtags]

---HOOKS---
[hook variation 1]
[hook variation 2]
[hook variation 3]`
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
      if (ws.tones?.length) parts.push(`Tone: ${ws.tones.join(", ")}`)
      if (ws.primaryGoal) parts.push(`Goal: ${ws.primaryGoal}`)
    } catch {
      parts.push(`Writing Style: ${profile.writingStyle}`)
    }
  }
  return parts.join("\n")
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let ideaId: string, tone: string | undefined, userInstruction: string | undefined
  try {
    const body = await req.json()
    ideaId = body.ideaId
    tone = typeof body.tone === "string" && body.tone ? body.tone : undefined
    userInstruction =
      typeof body.userInstruction === "string" && body.userInstruction.trim()
        ? body.userInstruction.trim()
        : undefined
    if (!ideaId) throw new Error("Missing ideaId")
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { profile: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
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

  const breakdown = idea.breakdowns[0].outline as unknown as BreakdownOutline
  const profileContext = formatProfile(user.profile)
  const prompt = buildCaptionPrompt(profileContext, { hook: idea.hook, category: idea.category }, breakdown, tone, userInstruction)

  // Stream Claude's response as plain text
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        })

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        console.error("[generate/caption] Claude stream error:", err)
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
