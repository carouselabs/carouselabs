// app/api/ideas/[id]/breakdown/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { Prisma } from "@prisma/client"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildBreakdownPrompt(hook: string, category: string, profileContext: string): string {
  return `You are generating a detailed LinkedIn post content breakdown.

Selected LinkedIn post idea:
Category: ${category}
Hook: "${hook}"

User profile:
${profileContext}

Generate a detailed content breakdown. Return ONLY a valid JSON object with exactly these keys (no markdown fences, no preamble, no trailing text):

{
  "deepDive": "A 600-700 word explanation of this topic written in 4-5 clear paragraphs. Explain what the topic/news is about, the background context, why it matters now, and what the implications are for the user's industry and audience. Write it like a well-researched mini article that gives someone the full picture before writing about it. Use clear, engaging prose — no bullet points, no headers, just flowing paragraphs.",
  "refinedHook": "The sharpened final hook line for the post",
  "postObjective": "What this post is trying to achieve in 1-2 sentences",
  "targetEmotion": "Primary emotion or psychological trigger this post creates in the reader",
  "recommendedStructure": "Step-by-step post structure e.g. Hook → Relatable problem → Framework → Proof → CTA",
  "keyTalkingPoints": "3-5 specific talking points to cover, separated by semicolons",
  "storytellingAngle": "The specific storytelling approach and framing to use",
  "suggestedCTA": "The exact call-to-action text to end the post with",
  "recommendedFormat": "text post / carousel / story / thread — pick the best one and explain why in one sentence",
  "visualIdea": "A concrete visual concept for image or slide if applicable, or N/A for text post",
  "engagementTips": "2-3 specific tips to maximize comments, saves, and shares on this exact post",
  "strongEndingLine": "The very last line of the post — a punchy, memorable closer"
}

Rules:
- Keep writing style aligned with user brand and tone
- Make output practical, engaging, and high-retention
- Avoid generic advice — every insight must be specific to this idea and profile
- Make output detailed enough that another AI can generate the full post directly from it`
}

// Extracts the JSON object from Claude's response, handles markdown fences and preamble text
function extractJSON(text: string): BreakdownOutline {
  let raw = text.trim()

  // Strip markdown fences: ```json ... ``` or ``` ... ```
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    raw = fenceMatch[1].trim()
  } else {
    // Slice from first { to last } to skip any preamble or trailing text
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      raw = raw.slice(start, end + 1)
    }
  }

  try {
    return JSON.parse(raw) as BreakdownOutline
  } catch {
    console.error("[breakdown] JSON.parse failed. Raw Claude output:\n", text)
    throw new Error("Claude returned a response that could not be parsed as JSON")
  }
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
  if (profile.targetAudience) parts.push(`Target Audience: ${profile.targetAudience}`)
  if (profile.contentPillars.length) parts.push(`Content Pillars: ${profile.contentPillars.join(", ")}`)
  if (profile.writingStyle) {
    try {
      const ws = JSON.parse(profile.writingStyle) as { tones?: string[]; primaryGoal?: string }
      if (ws.tones?.length) parts.push(`Tone: ${ws.tones.join(", ")}`)
      if (ws.primaryGoal) parts.push(`Goal: ${ws.primaryGoal}`)
    } catch {
      parts.push(`Writing Style: ${profile.writingStyle}`)
    }
  }
  return parts.join("\n")
}

// GET — return cached breakdown or 404
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const idea = await db.idea.findUnique({
      where: { id },
      include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
    })

    if (!idea || idea.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const cached = idea.breakdowns[0]
    if (!cached) return NextResponse.json({ error: "No breakdown yet" }, { status: 404 })

    return NextResponse.json({ breakdown: cached.outline as unknown as BreakdownOutline })
  } catch (err) {
    console.error("[breakdown:GET] unhandled error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — generate (or return cached) breakdown
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const user = await db.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (!user.profile) return NextResponse.json({ error: "Profile not found. Complete onboarding first." }, { status: 400 })

    const idea = await db.idea.findUnique({
      where: { id },
      include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
    })

    if (!idea || idea.userId !== user.id) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 })
    }

    // Return cached breakdown immediately if it exists
    if (idea.breakdowns[0]) {
      return NextResponse.json({
        breakdown: idea.breakdowns[0].outline as unknown as BreakdownOutline,
        cached: true,
      })
    }

    // Call Claude
    const profileContext = formatProfile(user.profile)
    const prompt = buildBreakdownPrompt(idea.hook, idea.category, profileContext)

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const block = message.content[0]
    if (block.type !== "text") {
      return NextResponse.json({ error: "Unexpected response from AI" }, { status: 502 })
    }

    // Parse — throws with a clear message if Claude's output isn't valid JSON
    const breakdown = extractJSON(block.text)

    // Persist
    await db.breakdown.create({
      data: {
        ideaId: idea.id,
        userId: user.id,
        outline: breakdown as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ breakdown, cached: false })
  } catch (err) {
    console.error("[breakdown:POST] unhandled error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
