import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { buildImagePrompt } from "@/lib/ai/prompts/imagePrompt"
import type { BreakdownOutline } from "@/lib/types/breakdown"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CAPTION_GHOSTWRITER_INSTRUCTION = `Act as a top 0.1% LinkedIn ghostwriter for AI founders. Read the deep dive and identify every unique insight, strategic implication, supporting argument, and founder perspective. Rewrite it into a LinkedIn post that preserves all high-value information while removing fluff, repetition, and unnecessary exposition. Optimize for readability, engagement, and authority—not virality or clickbait. The writing should feel human, opinionated, and experience-driven, with natural transitions and varied sentence lengths. The first three lines should create curiosity without hiding the value, and the rest should progressively reveal deeper insights. Prioritize clarity over hype, include practical takeaways, and end with a question that invites thoughtful discussion rather than generic comments. If any important idea from the original is omitted, explicitly add it back so that no meaningful strategic insight is lost. The final post should sound like an experienced founder or investor sharing hard-earned lessons, not an AI summarizing an article.`

// Targeted edit mode — apply ONLY the user's instruction to the existing image
// prompt, changing as little as possible. Returns the same JSON shape the
// parser expects (caption is unused by the client in this flow).
function buildImageEditPrompt(currentImagePrompt: string, userInstruction: string): string {
  return `You are editing an existing AI image prompt for a LinkedIn post. Do NOT rewrite it from scratch.

Apply ONLY this instruction to the current image prompt: ${userInstruction}

Current prompt:
${currentImagePrompt}

Make MINIMUM changes. Preserve everything else — keep all composition, colors (exact hex codes), typography, lighting, mood, and detail that the instruction does not require changing. Change only what the instruction explicitly asks for.

Return ONLY valid JSON, no markdown:
{
  "caption": "",
  "imagePrompt": string (the minimally-edited image prompt)
}`
}

function extractStringValue(raw: string, key: string): string | null {
  // Matches "key": "value" handling escaped quotes and multiline values
  const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`, "s")
  const match = raw.match(pattern)
  if (!match) return null
  // Unescape JSON string escapes
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1]
  }
}

function parseJsonResponse(raw: string): { caption: string; imagePrompt: string } {
  // 1. Direct JSON.parse
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
      console.log("[generate/image-prompt] Parsed via: direct JSON.parse")
      return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
    }
  } catch {}

  // 2. Extract outermost { ... } block and parse
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const extracted = raw.slice(start, end + 1)
      const parsed = JSON.parse(extracted)
      if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
        console.log("[generate/image-prompt] Parsed via: brace extraction")
        return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
      }
    }
  } catch {}

  // 3. Extract from ```json ... ``` block
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
        console.log("[generate/image-prompt] Parsed via: ```json block")
        return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
      }
    }
  } catch {}

  // 4. Extract from ``` ... ``` block (no language tag)
  try {
    const match = raw.match(/```\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.caption === "string" && typeof parsed.imagePrompt === "string") {
        console.log("[generate/image-prompt] Parsed via: ``` block")
        return { caption: parsed.caption, imagePrompt: parsed.imagePrompt }
      }
    }
  } catch {}

  // 5. Manual key extraction as last resort
  const caption = extractStringValue(raw, "caption")
  const imagePrompt = extractStringValue(raw, "imagePrompt")
  if (imagePrompt) {
    console.log("[generate/image-prompt] Parsed via: manual key extraction")
    return { caption: caption ?? "", imagePrompt }
  }

  throw new Error("All parsing strategies exhausted")
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let ideaId: string
  let caption: string
  let size: string
  let referenceImage: string | undefined
  let referenceMediaType: string
  let userInstruction: string | undefined
  let currentImagePrompt: string | undefined

  try {
    const body = await req.json()
    ideaId = body.ideaId
    caption = typeof body.caption === "string" ? body.caption : ""
    size = typeof body.size === "string" ? body.size : "4:5"
    referenceImage = typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
    userInstruction =
      typeof body.userInstruction === "string" && body.userInstruction.trim()
        ? body.userInstruction.trim()
        : undefined
    currentImagePrompt =
      typeof body.currentImagePrompt === "string" && body.currentImagePrompt.trim()
        ? body.currentImagePrompt
        : undefined
    if (!ideaId) throw new Error("Missing ideaId")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
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
  // Targeted edit when the user gave an instruction AND we have the current
  // prompt to edit; otherwise full regeneration as before.
  const prompt =
    userInstruction && currentImagePrompt
      ? buildImageEditPrompt(currentImagePrompt, userInstruction)
      : `${CAPTION_GHOSTWRITER_INSTRUCTION}

${buildImagePrompt(breakdown.refinedHook, breakdown.deepDive, caption, size, userInstruction)}`

  console.log("[image-prompt] Full prompt sent to Claude:\n", prompt)

  let claudeRaw: string
  try {
    const messageContent: Anthropic.MessageParam["content"] = referenceImage
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: referenceMediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: referenceImage,
            },
          },
          { type: "text", text: prompt },
        ]
      : prompt

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: messageContent }],
    })

    claudeRaw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
  } catch (err) {
    console.error("[generate/image-prompt] Claude error:", err)
    return NextResponse.json({ error: "Failed to generate content" }, { status: 502 })
  }

  console.log("[generate/image-prompt] Raw Claude response:\n", claudeRaw)

  let parsed: { caption: string; imagePrompt: string }
  try {
    parsed = parseJsonResponse(claudeRaw)
  } catch {
    console.error("[generate/image-prompt] All parse strategies failed. Raw:\n", claudeRaw)
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 })
  }

  if (!parsed.imagePrompt) {
    return NextResponse.json({ error: "Image prompt was empty in AI response" }, { status: 502 })
  }

  return NextResponse.json({ caption: parsed.caption, imagePrompt: parsed.imagePrompt })
}
