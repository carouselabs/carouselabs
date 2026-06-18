// app/api/ideas/more/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { z } from "zod"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { buildMorePrompt } from "@/lib/ai/prompts/ideas"
import { parseIdeasResponse } from "@/lib/ai/parsers/ideas"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Shared rate limit key with /generate — 10 AI calls per user per hour total
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: false,
})

const bodySchema = z.object({
  topic: z.string().optional().nullable(),
  alreadyShown: z.array(z.string()).max(30),
})

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse + validate body
  let topic: string | null = null
  let alreadyShown: string[] = []
  try {
    const raw = await req.json()
    const body = bodySchema.parse(raw)
    topic = body.topic?.trim() || null
    alreadyShown = body.alreadyShown
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Enforce 30-idea session cap server-side
  if (alreadyShown.length >= 30) {
    return NextResponse.json(
      { error: "Session limit reached. Start a new session to generate more ideas." },
      { status: 400 },
    )
  }

  // Rate limit (shared with /generate)
  const { success, remaining } = await ratelimit.limit(`ideas:generate:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. You can generate up to 10 times per hour." },
      { status: 429 },
    )
  }

  // Fetch user + profile (self-healing if the Clerk webhook hasn't landed yet).
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!user.profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 })
  }

  // Build prompt with dedup
  const prompt = buildMorePrompt(user.profile, topic, alreadyShown)

  // Call Claude
  let responseText: string
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })
    const block = message.content[0]
    if (block.type !== "text") throw new Error("Unexpected response type")
    responseText = block.text
  } catch (err) {
    console.error("[ideas/more] Claude error:", err)
    return NextResponse.json(
      { error: "Failed to generate ideas. Please try again." },
      { status: 502 },
    )
  }

  // Parse
  const parsed = parseIdeasResponse(responseText)
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "Could not parse ideas from AI response." },
      { status: 502 },
    )
  }

  // Save to DB
  const savedIdeas = await db.$transaction(
    parsed.map((idea) =>
      db.idea.create({
        data: {
          userId: user.id,
          title: idea.hook,
          hook: idea.hook,
          mode: idea.mode,
          category: idea.category,
        },
      }),
    ),
  )

  const ideas = savedIdeas.map((idea, i) => ({
    id: idea.id,
    hook: idea.hook,
    postType: parsed[i].postType,
    cta: parsed[i].cta,
    rawCategory: parsed[i].rawCategory,
    isPinned: false,
    isDismissed: false,
  }))

  return NextResponse.json({ ideas, remaining })
}
