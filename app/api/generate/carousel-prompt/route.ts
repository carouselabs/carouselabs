import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { buildCarouselPrompt } from "@/lib/ai/prompts/carouselPrompt"
import type { BreakdownOutline } from "@/lib/types/breakdown"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Slide {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  prompt: string
}

function extractStringValue(raw: string, key: string): string | null {
  const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S])*)"`, "s")
  const match = raw.match(pattern)
  if (!match) return null
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return match[1]
  }
}

function isValidSlideArray(val: unknown): val is Slide[] {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    val.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Slide).slideNumber === "number" &&
        typeof (s as Slide).headline === "string" &&
        typeof (s as Slide).prompt === "string",
    )
  )
}

function parseCarouselResponse(raw: string): { caption: string; slides: Slide[] } {
  // 1. Direct JSON.parse
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.caption === "string" && isValidSlideArray(parsed.slides)) {
      console.log("[generate/carousel-prompt] Parsed via: direct JSON.parse")
      return { caption: parsed.caption, slides: parsed.slides }
    }
  } catch {}

  // 2. Outermost { ... } block
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1))
      if (typeof parsed.caption === "string" && isValidSlideArray(parsed.slides)) {
        console.log("[generate/carousel-prompt] Parsed via: brace extraction")
        return { caption: parsed.caption, slides: parsed.slides }
      }
    }
  } catch {}

  // 3. ```json block
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.caption === "string" && isValidSlideArray(parsed.slides)) {
        console.log("[generate/carousel-prompt] Parsed via: ```json block")
        return { caption: parsed.caption, slides: parsed.slides }
      }
    }
  } catch {}

  // 4. ``` block (no language tag)
  try {
    const match = raw.match(/```\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.caption === "string" && isValidSlideArray(parsed.slides)) {
        console.log("[generate/carousel-prompt] Parsed via: ``` block")
        return { caption: parsed.caption, slides: parsed.slides }
      }
    }
  } catch {}

  // 5. Manual caption + slides array extraction
  const caption = extractStringValue(raw, "caption") ?? ""
  const slidesMatch = raw.match(/"slides"\s*:\s*(\[[\s\S]*?\])(?=\s*[,}])/)
  if (slidesMatch) {
    try {
      const slides = JSON.parse(slidesMatch[1])
      if (isValidSlideArray(slides)) {
        console.log("[generate/carousel-prompt] Parsed via: manual key extraction")
        return { caption, slides }
      }
    } catch {}
  }

  throw new Error("All parsing strategies exhausted")
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let ideaId: string
  let caption: string
  let size: string
  let referenceImageBase64: string | undefined
  let referenceMediaType: string

  try {
    const body = await req.json()
    ideaId = body.ideaId
    caption = typeof body.caption === "string" ? body.caption : ""
    size = typeof body.size === "string" ? body.size : "4:5"
    referenceImageBase64 =
      typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
    if (!ideaId) throw new Error("Missing ideaId")
    console.log("[carousel-prompt] Reference image received:", !!referenceImageBase64)
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
  const prompt = buildCarouselPrompt(
    breakdown.refinedHook,
    breakdown.deepDive,
    caption,
    size,
    !!referenceImageBase64,
    breakdown.keyTalkingPoints,
    breakdown.recommendedStructure,
    breakdown.storytellingAngle,
    breakdown.strongEndingLine,
  )

  let claudeRaw: string
  try {
    const messages = referenceImageBase64
      ? [
          {
            role: "user" as const,
            content: [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: (referenceMediaType || "image/jpeg") as
                    | "image/jpeg"
                    | "image/png",
                  data: referenceImageBase64.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
              {
                type: "text" as const,
                text: prompt,
              },
            ],
          },
        ]
      : [
          {
            role: "user" as const,
            content: prompt,
          },
        ]

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      messages,
    })

    claudeRaw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
  } catch (err) {
    console.error("[generate/carousel-prompt] Claude error:", err)
    return NextResponse.json({ error: "Failed to generate content" }, { status: 502 })
  }

  console.log("[generate/carousel-prompt] Raw Claude response:\n", claudeRaw)

  if (!claudeRaw.trimEnd().endsWith("}")) {
    console.warn("[generate/carousel-prompt] WARNING: Response may be truncated — does not end with }")
  }

  let parsed: { caption: string; slides: Slide[] }
  try {
    parsed = parseCarouselResponse(claudeRaw)
  } catch {
    console.error("[generate/carousel-prompt] All parse strategies failed. Raw:\n", claudeRaw)
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 })
  }

  if (!parsed.slides.length) {
    return NextResponse.json({ error: "No slides found in AI response" }, { status: 502 })
  }

  return NextResponse.json({ caption: parsed.caption, slides: parsed.slides })
}
