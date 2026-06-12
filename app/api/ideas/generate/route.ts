// app/api/ideas/generate/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { db } from "@/lib/db"
import { buildModeAPrompt, buildModeBPrompt } from "@/lib/ai/prompts/ideas"
import { parseIdeasResponse } from "@/lib/ai/parsers/ideas"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: false,
})

// Fetch real, recent headlines from NewsAPI.org so the Latest News ideas can be
// grounded in actual articles instead of relying solely on Claude's web search.
// Returns a formatted bullet list, or "" if the key is missing, the request
// fails, or no articles come back — callers then fall back to web search.
async function fetchRealNews(niche: string): Promise<string> {
  const newsApiKey = process.env.NEWS_API_KEY
  if (!newsApiKey) return ""

  try {
    const newsQuery = encodeURIComponent(niche)
    const newsUrl = `https://newsapi.org/v2/everything?q=${newsQuery}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${newsApiKey}`

    const newsRes = await fetch(newsUrl)
    const newsData = await newsRes.json()
    const articles = newsData.articles ?? []

    return articles
      .map(
        (a: any) =>
          `- ${a.title} (${a.publishedAt?.split("T")[0]}) — ${a.source?.name}`,
      )
      .join("\n")
  } catch (err) {
    console.warn("[ideas/generate] NewsAPI fetch failed:", err)
    return ""
  }
}

// Generate the raw ideas text from Claude. With web search enabled, Latest News
// ideas are grounded in real results; without it, Claude generates from its own
// knowledge. Handles the server-side pause_turn loop and extracts all text.
async function generateIdeasText(prompt: string, useWebSearch: boolean): Promise<string> {
  const tools: Anthropic.Tool[] = [
    { type: "web_search_20260209", name: "web_search" } as unknown as Anthropic.Tool,
  ]

  async function call(messages: Anthropic.MessageParam[]) {
    return anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      ...(useWebSearch ? { tools } : {}),
      messages,
    })
  }

  let message = await call([{ role: "user", content: prompt }])

  // The server-side web_search loop can return stop_reason "pause_turn" when it
  // hits its internal iteration cap — resume by re-sending until it ends.
  let guard = 0
  while (message.stop_reason === "pause_turn" && guard < 5) {
    message = await call([
      { role: "user", content: prompt },
      { role: "assistant", content: message.content },
    ])
    guard++
  }

  // With web search, Claude returns multiple content blocks (server_tool_use,
  // web_search_tool_result, and text). Join every text block — the 10 ideas
  // live in the final text block(s); the parser ignores non-idea lines.
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  if (!text.trim()) throw new Error("No text content in Claude response")
  return text
}

export async function POST(req: Request) {
  // Auth
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit
  const { success, remaining } = await ratelimit.limit(`ideas:generate:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. You can generate up to 10 times per hour." },
      { status: 429 },
    )
  }

  // Parse body
  let topic: string | null = null
  try {
    const body = await req.json()
    const raw = typeof body.topic === "string" ? body.topic.trim() : ""
    topic = raw.length > 0 ? raw : null
  } catch {
    // empty body is fine — defaults to Mode A
  }

  // Fetch user + profile
  const user = await db.user.findUnique({
    where: { clerkId },
    include: { profile: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (!user.profile) {
    return NextResponse.json({ error: "Profile not found. Complete onboarding first." }, { status: 400 })
  }

  // Build prompt
  const basePrompt = topic
    ? buildModeBPrompt(user.profile, topic)
    : buildModeAPrompt(user.profile)

  // Fetch real news up front and inject it at the top of the prompt. When
  // NewsAPI returns articles, Claude is told to use only these for Latest News;
  // when it returns nothing (no key, failure, empty), we leave the prompt as-is
  // and rely on web search as before.
  const userNiche = topic || user.profile.industry || ""
  const realNewsContext = await fetchRealNews(userNiche)

  // Confirm the profile is actually feeding the prompt (role/topics live in the
  // writingStyle JSON / contentPillars; niche == industry unless a topic is set).
  let ideasRole = ""
  try {
    ideasRole = JSON.parse(user.profile.writingStyle ?? "{}").role ?? ""
  } catch {}
  console.log(
    `[ideas] Profile used: role=${ideasRole} industry=${user.profile.industry ?? ""} niche=${userNiche} topics=${user.profile.contentPillars.join(", ")}`,
  )

  const prompt = realNewsContext
    ? `REAL NEWS FROM TODAY (use these for Latest News ideas):
${realNewsContext}

Use the above real news headlines to generate the 3 Latest News ideas. Only use these — do not make up other news.

${basePrompt}`
    : basePrompt

  // Try web search first; if the tool isn't available (not enabled on the
  // account, unsupported, etc.) fall back to plain generation so the app never
  // breaks.
  let responseText: string
  let usedWebSearch = true
  try {
    responseText = await generateIdeasText(prompt, true)
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    const isToolError = msg.includes("tool") || msg.includes("web_search")

    if (!isToolError) {
      console.error("[ideas/generate] Claude error:", err)
      return NextResponse.json(
        { error: "Failed to generate ideas. Please try again." },
        { status: 502 },
      )
    }

    // Web search failed — retry the same prompt without the tools array.
    console.warn("[ideas/generate] web search unavailable, falling back:", err)
    usedWebSearch = false
    try {
      responseText = await generateIdeasText(prompt, false)
    } catch (fallbackErr) {
      console.error("[ideas/generate] Claude error (no web search):", fallbackErr)
      return NextResponse.json(
        { error: "Failed to generate ideas. Please try again." },
        { status: 502 },
      )
    }
  }

  console.log("[ideas] Using web search:", usedWebSearch)

  // Log raw Claude output to help debug format variations
  console.log("[ideas/generate] Raw Claude response:\n", responseText)

  // Parse ideas — returns partial results if only some lines matched
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

  // Shape response
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
