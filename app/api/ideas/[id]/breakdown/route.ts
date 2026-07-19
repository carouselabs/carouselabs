// app/api/ideas/[id]/breakdown/route.ts
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { validateContentTopic } from "@/lib/validateTopic"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { Prisma } from "@prisma/client"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Breakdowns are free (included in the post-level charge) but each NEW one is
// a real Claude call — cap generation per user. Cached reads aren't limited.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: false,
})

function buildBreakdownPrompt(hook: string, profileContext: string): string {
  return `You are a world-class LinkedIn content strategist and ghostwriter. Your ONLY job is to take a post idea and BUILD the actual content — not explain it, not summarize it, but fully create it.

Think of yourself as the person who sits between the idea and the post. You take a rough idea and turn it into something real, detailed, and ready to use.

POST IDEA: "${hook}"

USER PROFILE:
${profileContext}

YOUR TASK:
Build out the FULL CONTENT for this post idea. Go deep. Be specific. Create real value.

HOW TO BUILD IT:

If the idea is a LIST (10 truths, 5 tools, 7 mistakes, etc.):
→ Write out EVERY item on the list
→ For each item: give it a bold header, then 3-4 sentences explaining it clearly
→ Include real examples, real names, real numbers where possible
→ Make each point standalone and powerful

If the idea is a STORY (my journey, what happened when, how I went from X to Y):
→ Build the full story arc: setup → conflict → turning point → lesson
→ Include specific details, emotions, dialogue if relevant
→ End with a clear takeaway

If the idea is an OPINION or HOT TAKE (unpopular opinion, why X is wrong, the truth about Y):
→ Build the full argument with evidence
→ Include counterarguments and why they're wrong
→ Give real examples that support the point
→ Make it provocative but backed up

If the idea is EDUCATIONAL (how to do X, the framework for Y, understanding Z):
→ Break it into clear steps or components
→ Explain each one with examples
→ Include common mistakes people make
→ Give actionable takeaways

FORMAT:
- **Bold Header** for each main point or section
- 3-5 sentences of rich content under each header
- 5-7 sections total
- 600-800 words
- No bullet points inside sections — write in flowing sentences
- Real specific examples over generic statements

WRITING STYLE:
- Simple English — write like you are talking to a friend
- Short sentences — easy to read
- Confident and direct — no fluff
- Every sentence must earn its place

Return ONLY valid JSON with no markdown fences:
{
  "deepDive": "your full 600-800 word content build here with **Bold Headers** and detailed paragraphs",
  "refinedHook": "the sharpest most compelling version of this hook for LinkedIn",
  "keyTalkingPoints": "the 4-5 main points you covered, each in one sentence, separated by semicolons",
  "strongEndingLine": "one punchy memorable line that would make a perfect ending for this post"
}`
}

// Extracts the JSON object from Claude's response, handles markdown fences and preamble text
function extractJSON(text: string): BreakdownOutline {
  // Log raw Claude output to help debug format variations / parse failures
  console.log("[breakdown] Raw Claude response:\n", text)

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
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

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
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    if (!user.profile) return NextResponse.json({ error: "Profile not found. Complete onboarding first." }, { status: 400 })

    const idea = await db.idea.findUnique({
      where: { id },
      include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
    })

    if (!idea || idea.userId !== user.id) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 })
    }

    // Return cached breakdown immediately if it exists (does NOT cost a credit).
    if (idea.breakdowns[0]) {
      return NextResponse.json({
        breakdown: idea.breakdowns[0].outline as unknown as BreakdownOutline,
        cached: true,
      })
    }

    // Rate-limit only NEW breakdown generation (cached returns above are free
    // DB reads and shouldn't count against the budget).
    const { success } = await ratelimit.limit(`generate:breakdown:${user.id}`)
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit reached. Please try again later." },
        { status: 429 },
      )
    }

    // Keep CarouseLabs to social-media content — reject general-assistant misuse
    // before spending a credit or calling the model.
    const topicCheck = validateContentTopic(idea.hook)
    if (!topicCheck.valid) {
      return NextResponse.json(
        { error: topicCheck.error, invalidTopic: true },
        { status: 400 },
      )
    }

    // Breakdowns are free under the weighted credit system — the charge happens
    // at the post level (caption/image/carousel first generation) via
    // /api/credits/consume, and the breakdown is included in that cost.

    // Call Claude — single call, no web search, no tools.
    const profileContext = formatProfile(user.profile)
    const prompt = buildBreakdownPrompt(idea.hook, profileContext)

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    })

    const block = message.content[0]
    if (block.type !== "text") {
      return NextResponse.json({ error: "Unexpected AI response" }, { status: 502 })
    }

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
