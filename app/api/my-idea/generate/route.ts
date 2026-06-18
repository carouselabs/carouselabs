// app/api/my-idea/generate/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { validateContentTopic } from "@/lib/validateTopic"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { Prisma } from "@prisma/client"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Builds the deep-dive prompt for a user's OWN idea — shaped by their angle/POV
// and any specific points they want covered. Same JSON shape as the regular
// breakdown so the /idea/[id] page and downstream generators work unchanged.
function buildMyIdeaPrompt(
  topic: string,
  pov: string | undefined,
  guidelines: string | undefined,
  profileContext: string,
): string {
  const povBlock = pov ? `\nThe user's angle / point of view:\n${pov}\n` : ""
  const guidelinesBlock = guidelines
    ? `\nSpecific points the user wants covered:\n${guidelines}\n`
    : ""

  return `You are generating a detailed deep dive for a LinkedIn post based on the user's OWN idea.

IMPORTANT: Before writing, use web search to find real, current, verified facts about this topic. Search for the actual story, real statistics, real quotes, and real details. Only include information you can verify. Do not make up facts, dates, names, or statistics. If the idea is a personal story, still search for real supporting context, data, and background where relevant.

The user's idea / topic:
${topic}
${povBlock}${guidelinesBlock}
User profile:
${profileContext}

Now write a DEEP DIVE about this topic, shaped by the user's angle and the specific points they asked for. Return ONLY a valid JSON object with exactly these keys (no markdown, no preamble):

{
  "deepDive": "Write minimum 1100 words about this topic.\n\nFORMAT — use this structure every time:\n- Break the deep dive into 5-7 clear sections\n- Each section has a bold header like **What Happened** or **Why This Matters**\n- Under each header write 3-5 short bullet points with key facts\n- Each bullet point is 1-2 sentences maximum — short and clear\n- After bullet points add 2-3 sentences of simple explanation if needed\n- Use simple everyday English — no jargon\n- Short sentences — easy to read\n- Tell the full story from beginning to end\n- Cover: what happened → why it happened → who is involved → what it means → why it matters to the reader\n- Honor the user's angle/POV and the specific points they asked to include\n- Use real verified facts from web search only\n- Every section should teach the reader something new\n- The reader should finish feeling like they fully understand the topic\n\nEXAMPLE STRUCTURE:\n**What Happened**\n- Key fact 1\n- Key fact 2\n- Key fact 3\n2-3 sentences of simple explanation.\n\n**Why It Happened**\n- Key fact 1\n- Key fact 2\n2-3 sentences of simple explanation.\n\nAnd so on for all sections. Return this as a single JSON string with newlines escaped as \\n.",
  "refinedHook": "Sharpen the user's idea into the most compelling LinkedIn hook line",
  "postObjective": "What this post achieves in 1-2 sentences",
  "targetEmotion": "Primary emotion this post creates in readers",
  "recommendedStructure": "Step by step post structure",
  "keyTalkingPoints": "3-5 specific talking points separated by semicolons",
  "storytellingAngle": "The specific storytelling approach to use",
  "suggestedCTA": "The exact call to action text",
  "recommendedFormat": "text post or carousel or story — pick one and explain why",
  "visualIdea": "A concrete visual concept or N/A",
  "engagementTips": "2-3 specific tips to maximize comments saves and shares",
  "strongEndingLine": "The very last punchy memorable line of the post"
}

Rules:
- Only use real verified facts from web search
- Honor the user's angle/POV and requested points
- Deep dive must be minimum 1100 words
- Simple English anyone can understand
- Engaging story format not dry report
- Match user brand and tone`
}

// Extracts the JSON object from Claude's response, handling markdown fences and
// preamble text.
function extractJSON(text: string): BreakdownOutline {
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
    return JSON.parse(raw) as BreakdownOutline
  } catch {
    console.error("[my-idea] JSON.parse failed. Raw Claude output:\n", text)
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

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Parse body
    let topic: string
    let pov: string | undefined
    let guidelines: string | undefined
    try {
      const body = await req.json()
      topic = typeof body.topic === "string" ? body.topic.trim() : ""
      pov = typeof body.pov === "string" && body.pov.trim() ? body.pov.trim() : undefined
      guidelines =
        typeof body.guidelines === "string" && body.guidelines.trim()
          ? body.guidelines.trim()
          : undefined
      if (!topic) throw new Error("Please describe your idea or topic")
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid request body" },
        { status: 400 },
      )
    }

    // Keep CarouseLabs to social-media content — block general-assistant misuse
    // (code, homework, recipes, translation, etc.) across topic + angle + notes.
    const topicCheck = validateContentTopic([topic, pov, guidelines].filter(Boolean).join(" "))
    if (!topicCheck.valid) {
      return NextResponse.json(
        { error: topicCheck.error, invalidTopic: true },
        { status: 400 },
      )
    }

    if (!user.profile) {
      return NextResponse.json(
        { error: "Profile not found. Complete onboarding first." },
        { status: 400 },
      )
    }

    // Generate the breakdown with web search enabled so it's grounded in real,
    // current facts.
    const profileContext = formatProfile(user.profile)
    const prompt = buildMyIdeaPrompt(topic, pov, guidelines, profileContext)

    const tools = [
      { type: "web_search_20260209", name: "web_search" } as unknown as Anthropic.Tool,
    ]

    let message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      tools,
      messages: [{ role: "user", content: prompt }],
    })

    // The server-side web_search loop can return stop_reason "pause_turn" when it
    // hits its internal iteration cap — resume by re-sending until it ends.
    let guard = 0
    while (message.stop_reason === "pause_turn" && guard < 5) {
      message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8000,
        tools,
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: message.content },
        ],
      })
      guard++
    }

    // With web search, Claude returns multiple content blocks — join every text
    // block; the JSON lives in the final text block(s).
    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")

    if (!rawText.trim()) {
      return NextResponse.json({ error: "Unexpected response from AI" }, { status: 502 })
    }

    const breakdown = extractJSON(rawText)

    // Create the Idea (user's own → PERSONAL / OTHER). Use the refined hook for a
    // clean detail-page heading, falling back to the user's raw topic.
    const hook = breakdown.refinedHook?.trim() || topic
    const idea = await db.idea.create({
      data: {
        userId: user.id,
        title: hook.slice(0, 300),
        hook,
        mode: "PERSONAL",
        category: "OTHER",
      },
    })

    // Save the breakdown linked to the new idea.
    await db.breakdown.create({
      data: {
        ideaId: idea.id,
        userId: user.id,
        outline: breakdown as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ ideaId: idea.id })
  } catch (err) {
    console.error("[my-idea/generate] unhandled error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
