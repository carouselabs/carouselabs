// app/api/own-idea/generate/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import Anthropic from "@anthropic-ai/sdk"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateContentTopic } from "@/lib/validateTopic"
import { countWords } from "@/lib/wordCount"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { Prisma } from "@prisma/client"

// Deep dive generation can take time for complex topics — matches the timeout
// used by other complex AI routes (carousel-prompt).
export const maxDuration = 300

// Mirrors the client-side caps in app/(app)/own-idea/page.tsx — enforced here
// too since the client's truncation can be bypassed by calling this API directly.
const TITLE_WORD_LIMIT = 15
const STRUCTURE_WORD_LIMIT = 650

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: false,
})

const RESEARCH_EXPANSION_SYSTEM_PROMPT = `You are an expert Research Expansion AI.
Your purpose is to transform incomplete ideas into complete, well-structured knowledge.
The user will provide:
- A topic.
- Their current understanding, notes, bullet points, outline, or rough ideas.

Your job is NOT to generate a post, article, script, carousel, or marketing copy.
Instead, create a comprehensive knowledge document that captures everything someone would need to understand the topic deeply.

Core Responsibilities
1. Analyze the topic and the user's input.
2. Understand what information already exists.
3. Identify important missing information.
4. Expand every idea with meaningful depth.
5. Automatically determine the best structure for the topic.
6. Produce a clean, logical, and comprehensive knowledge base.

Structure
Do NOT follow a fixed template.
Instead:
- Decide the structure dynamically.
- Create sections only when they make sense.
- Merge or split sections when appropriate.
- Use headings and subheadings naturally.
- Organize information from foundational concepts to advanced details.

Every topic deserves its own structure.
For example:
- AI tools may require capabilities, pricing, use cases, comparisons, integrations, strengths, weaknesses, and ideal users.
- A startup may require problem, solution, market, competitors, business model, traction, and risks.
- A programming language may require syntax, ecosystem, frameworks, performance, advantages, limitations, and real-world usage.
- A historical event may require timeline, causes, key figures, consequences, and impact.
- A medical topic may require symptoms, causes, diagnosis, treatment, prevention, and current research.

Never force one topic into another topic's structure.

Expansion Rules
Expand only where useful.
Add missing information only if it genuinely improves understanding.
Remove redundancy.
Keep the information logically connected.
When useful:
- explain concepts
- provide examples
- explain relationships
- compare alternatives
- identify trade-offs
- mention edge cases
- explain terminology
- include practical insights
- include technical details
- mention misconceptions
- highlight important facts

If something is irrelevant for the topic, do not include it.

Accuracy
Never invent facts.
Separate facts from assumptions.
If information cannot be verified confidently, state that uncertainty instead of guessing.

Output Goal
The final output should feel like a professionally researched knowledge brief that another AI, writer, designer, or strategist could use to create any kind of content.
The result should be:
- Deep
- Organized
- Adaptive
- Context-aware
- Information-rich
- Easy to navigate
- Free from unnecessary fluff

Your job is not to write content.
Your job is to build knowledge.

OUTPUT FORMAT — CRITICAL:
After building the knowledge document, you must ALSO extract and format the output as JSON so it can integrate with the existing content pipeline:

Return ONLY valid JSON in this exact structure:
{
  "refinedHook": "a sharp one-line summary of the core topic (max 20 words)",
  "deepDive": "the FULL comprehensive knowledge document as plain text with natural headings, 800-2000 words depending on topic complexity",
  "keyTalkingPoints": ["5-8 of the most important, distinct facts or insights extracted from the knowledge document"],
  "strongEndingLine": "one sentence that captures the single most important takeaway from the entire knowledge document"
}

The deepDive field should contain your full knowledge document with natural section headers (using plain text formatting like "## Section Name" or just clear paragraph breaks between topics — whatever is natural for this specific topic).`

function buildOwnIdeaUserMessage(title: string, structure: string): string {
  return `Topic: ${title}

User's current understanding/notes/outline:
${structure}

Please build the comprehensive knowledge document following the system instructions. Output ONLY valid JSON.`
}

// Claude returns keyTalkingPoints as an array; the pipeline's BreakdownOutline
// stores it as a single string.
interface OwnIdeaOutput {
  refinedHook: string
  deepDive: string
  keyTalkingPoints: string[] | string
  strongEndingLine: string
}

// Extracts the JSON object from Claude's response, handling markdown fences and
// preamble text (same strategy as /api/ideas/[id]/breakdown).
function extractJSON(text: string): OwnIdeaOutput {
  let raw = text.trim()

  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    raw = fenceMatch[1].trim()
  } else {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      raw = raw.slice(start, end + 1)
    }
  }

  try {
    return JSON.parse(raw) as OwnIdeaOutput
  } catch {
    console.error("[own-idea] JSON.parse failed. Raw Claude output:\n", text)
    throw new Error("unparseable")
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Rate limit (cost guard) — keyed by Clerk user id so it can't be spammed
    // even by a Pro user with credits. 10/hour, same window as ideas/generate.
    const { userId: clerkId } = await auth()
    const { success } = await ratelimit.limit(`own-idea:generate:${clerkId}`)
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit reached. You can generate up to 10 times per hour." },
        { status: 429 },
      )
    }

    // Parse body
    let title: string
    let structure: string
    try {
      const body = await req.json()
      title = typeof body.title === "string" ? body.title.trim() : ""
      structure = typeof body.structure === "string" ? body.structure.trim() : ""
      if (!title) throw new Error("Please give your idea a title")
      if (!structure) throw new Error("Please describe your idea")
      if (countWords(title) > TITLE_WORD_LIMIT) {
        throw new Error(`Title must be ${TITLE_WORD_LIMIT} words or fewer`)
      }
      if (countWords(structure) > STRUCTURE_WORD_LIMIT) {
        throw new Error(`Description must be ${STRUCTURE_WORD_LIMIT} words or fewer`)
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid request body" },
        { status: 400 },
      )
    }

    // Keep CarouseLabs to social-media content — block general-assistant misuse
    // (code, homework, recipes, translation, etc.) across title + structure.
    const topicCheck = validateContentTopic([title, structure].join(" "))
    if (!topicCheck.valid) {
      return NextResponse.json(
        { error: topicCheck.error, invalidTopic: true },
        { status: 400 },
      )
    }

    // Build the knowledge document with Claude.
    let response: Anthropic.Message
    const startTime = Date.now()
    try {
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 5000,
        messages: [
          {
            role: "user",
            content: `${RESEARCH_EXPANSION_SYSTEM_PROMPT}\n\n${buildOwnIdeaUserMessage(title, structure)}`,
          },
        ],
      })
      const duration = Date.now() - startTime
      console.log(`[own-idea] Claude generation took ${duration}ms`)
      if (duration > 90000) {
        console.warn(
          `[own-idea] WARNING: Generation took over 90s (${duration}ms) — approaching timeout risk`,
        )
      }
    } catch (err) {
      console.error("[own-idea/generate] Anthropic API error:", err)
      return NextResponse.json(
        { error: "We couldn't build your idea right now. Please try again in a moment." },
        { status: 502 },
      )
    }

    const rawText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")

    if (!rawText.trim() || response.stop_reason === "refusal") {
      console.error("[own-idea/generate] empty or refused response. stop_reason:", response.stop_reason)
      return NextResponse.json(
        { error: "We couldn't build this idea. Try rewording your title or notes." },
        { status: 502 },
      )
    }

    let output: OwnIdeaOutput
    try {
      output = extractJSON(rawText)
    } catch {
      return NextResponse.json(
        { error: "We couldn't process the generated content. Please try again." },
        { status: 502 },
      )
    }

    const refinedHook = typeof output.refinedHook === "string" && output.refinedHook.trim()
      ? output.refinedHook.trim()
      : title
    const deepDive = typeof output.deepDive === "string" ? output.deepDive.trim() : ""
    const keyTalkingPoints = Array.isArray(output.keyTalkingPoints)
      ? output.keyTalkingPoints.filter((p) => typeof p === "string").map((p) => p.trim())
      : typeof output.keyTalkingPoints === "string" && output.keyTalkingPoints.trim()
        ? [output.keyTalkingPoints.trim()]
        : []
    const strongEndingLine =
      typeof output.strongEndingLine === "string" ? output.strongEndingLine.trim() : ""

    if (!deepDive) {
      console.error("[own-idea/generate] parsed JSON missing deepDive. Raw:\n", rawText)
      return NextResponse.json(
        { error: "We couldn't process the generated content. Please try again." },
        { status: 502 },
      )
    }

    // Create the Idea — source "own-idea" distinguishes it from trending ideas.
    const idea = await db.idea.create({
      data: {
        userId: user.id,
        title: refinedHook.slice(0, 300),
        hook: refinedHook,
        mode: "PERSONAL",
        category: "OTHER",
        source: "own-idea",
      },
    })

    // Save the breakdown in the pipeline's outline shape — keyTalkingPoints is
    // a single semicolon-separated string downstream.
    const outline: BreakdownOutline = {
      refinedHook,
      deepDive,
      keyTalkingPoints: keyTalkingPoints.join("; "),
      strongEndingLine,
    }

    await db.breakdown.create({
      data: {
        ideaId: idea.id,
        userId: user.id,
        outline: outline as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      ideaId: idea.id,
      refinedHook,
      deepDive,
      keyTalkingPoints,
      strongEndingLine,
    })
  } catch (err) {
    console.error("[own-idea/generate] unhandled error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
