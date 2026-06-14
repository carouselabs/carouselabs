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

// Fetch real headlines from the LAST 48 HOURS via NewsAPI.org so the Latest News
// ideas are grounded in actual articles. Returns a formatted bullet list, or ""
// if the key is missing, the request fails, or no articles come back — callers
// then fall back to Claude's training knowledge for trending ideas.
async function fetchRealNews(query: string): Promise<string> {
  const newsApiKey = process.env.NEWS_API_KEY
  console.log("[news] API Key exists:", !!newsApiKey)
  console.log("[news] Query:", query)

  if (!newsApiKey || !query.trim()) {
    console.log("[news] Skipping - no key or empty query")
    return ""
  }

  try {
    const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const enhancedQuery = query.trim() // just the niche, no " news" suffix
    const newsQuery = encodeURIComponent(enhancedQuery)
    const newsUrl = `https://newsapi.org/v2/everything?q=${newsQuery}&from=${from}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${newsApiKey}`

    // Redact the API key so it never lands in logs.
    console.log("[news] Fetching URL:", newsUrl.replace(newsApiKey, "[REDACTED]"))

    const newsRes = await fetch(newsUrl)
    const newsData = await newsRes.json()

    console.log("[news] Status:", newsRes.status)
    console.log("[news] Articles count:", newsData.articles?.length ?? 0)
    console.log("[news] Error:", newsData.message ?? "none")

    const articles = newsData.articles ?? []
    if (articles.length === 0) return ""

    // Stricter relevance: require at least 2 query words (or all of them, if the
    // query is shorter) to appear in the title or description.
    const queryWords = query.toLowerCase().split(" ").filter((w: string) => w.length > 2)
    const relevant = articles.filter((a: { title?: string; description?: string }) => {
      const text = ((a.title ?? "") + " " + (a.description ?? "")).toLowerCase()
      const matchCount = queryWords.filter((word: string) => text.includes(word)).length
      return matchCount >= Math.min(2, queryWords.length)
    })

    const finalArticles = relevant.length > 0 ? relevant.slice(0, 5) : []
    if (finalArticles.length === 0) return ""

    return finalArticles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => `- ${a.title} (${a.publishedAt?.split("T")[0]}) — ${a.source?.name}`)
      .join("\n")
  } catch (err) {
    console.warn("[news] Fetch failed:", err)
    return ""
  }
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

  // Parse body — topic is optional (empty → Mode A, text → Mode B)
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

  // Fetch real news (NewsAPI, free) for the topic (Mode B) or industry (Mode A).
  // Passed into the prompt builder, which places it at the top for Latest News.
  const userNiche = topic || user.profile.industry || ""
  const realNews = await fetchRealNews(userNiche)
  console.log("[news] Real news being passed to prompt:\n", realNews || "NONE - no articles found")

  // Build the prompt (Mode A or B), with real news injected at the top.
  const prompt = topic
    ? buildModeBPrompt(user.profile, topic, realNews)
    : buildModeAPrompt(user.profile, realNews)

  // Single Claude call — no web search. NewsAPI already supplies real headlines,
  // so a plain completion keeps cost ~$0.01 per generation.
  let text: string
  try {
    const responseText = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    text = responseText.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
  } catch (err) {
    console.error("[ideas/generate] Claude error:", err)
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 502 })
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 502 })
  }

  // Log raw Claude output to help debug format variations
  console.log("[ideas/generate] Raw Claude response:\n", text)

  // Parse ideas — returns partial results if only some lines matched
  const parsed = parseIdeasResponse(text)
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
