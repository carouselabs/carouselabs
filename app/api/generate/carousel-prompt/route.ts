import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getCurrentUser } from "@/lib/auth"
import OpenAI from "openai"
import { db } from "@/lib/db"
import {
  CAROUSEL_MASTER_SYSTEM_PROMPT,
  buildCarouselUserMessage,
} from "@/lib/ai/prompts/carouselPrompt"
import { validateReferenceImage } from "@/lib/validateImage"
import type { BreakdownOutline } from "@/lib/types/breakdown"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// The structured multi-slide generation can run long; allow up to 300s so it
// isn't cut off by the platform's shorter default function timeout.
export const maxDuration = 300

// Output budget for the slide-prompt generation, pinned to GPT-4o's hard output
// ceiling (16,384 tokens — no gpt-4o snapshot supports more). The
// 900-1200-words × 7-9-slide target (~14k tokens + JSON escaping overhead) runs
// close to this ceiling — the near-ceiling warning below is the early signal
// that prompts are being cut.
const MAX_TOKENS = 16384
// Warn when output lands close enough to MAX_TOKENS that truncation is likely.
const TOKEN_WARN_THRESHOLD = 15000

// Each call generates 7-9 long slide prompts and is the entry point to the
// expensive image-generation flow, so cap it per user like carousel-images.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: false,
})

interface Slide {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  prompt: string
}

// Targeted edit mode — apply ONLY the user's instruction to the existing slides,
// touching as few slides as possible. Returns the same JSON shape the parser
// expects (caption is unused by the client in this flow).
function buildCarouselEditPrompt(currentSlides: string, userInstruction: string): string {
  return `You are editing an existing LinkedIn carousel. Do NOT rewrite all the slides from scratch.

Apply ONLY this instruction to the current carousel slides: ${userInstruction}

Current slides:
${currentSlides}

Make MINIMUM changes to the relevant slides only. Preserve every other slide and field exactly as is — keep slideNumber, role, and all unaffected headlines and prompts identical. Change only the slides the instruction explicitly affects.

Return ONLY valid JSON, no markdown:
{
  "caption": "",
  "slides": [
    {
      "slideNumber": number,
      "role": "hook" | "body" | "cta",
      "headline": string,
      "prompt": string
    }
  ]
}`
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

// Lenient cleanup for a roughly-extracted string value: unescape \" and flatten
// any escaped/raw newlines so a long prompt survives as plain single-line text.
// Used only by the recovery path, where exact escaping fidelity doesn't matter.
function cleanLooseString(s: string): string {
  return s
    .replace(/\\"/g, '"') // \" → "
    .replace(/\\n|\\t|\\r/g, " ") // escaped whitespace → space
    .replace(/[\r\n\t]+/g, " ") // raw control chars → space
    .replace(/\s+/g, " ")
    .trim()
}

// Like cleanLooseString but PRESERVES line breaks. Slide prompts carry markdown
// structure (## section headers, ━━━ separators) that downstream stripping in
// carousel-images matches with line-anchored regexes — flattening newlines here
// would fuse headers into body text and defeat that stripping.
function cleanLooseMultiline(s: string): string {
  return s
    .replace(/\\"/g, '"') // \" → "
    .replace(/\\n/g, "\n") // escaped newline → real newline
    .replace(/\\[tr]/g, " ") // escaped tab/CR → space
    .replace(/[ \t]+/g, " ") // collapse runs of spaces, keep newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// Per-slide recovery: split the candidate into one chunk per slide (at each
// "slideNumber" key) and pull slideNumber/role/headline/prompt out of each chunk
// with tolerant regexes. Because each slide is handled independently, one slide
// with unescaped quotes can't break the rest. `prompt` is the last field in the
// shape, so it's captured greedily up to the final quote in its chunk — which
// survives embedded unescaped quotes inside the prompt text.
function recoverSlides(candidate: string): { caption: string; slides: Slide[] } | null {
  const caption = extractStringValue(candidate, "caption") ?? ""

  const chunks = candidate.split(/(?="slideNumber"\s*:)/).slice(1)
  const slides: Slide[] = []
  for (const chunk of chunks) {
    const numMatch = chunk.match(/"slideNumber"\s*:\s*(\d+)/)
    const roleMatch = chunk.match(/"role"\s*:\s*"(hook|body|cta)"/)
    const headlineMatch = chunk.match(/"headline"\s*:\s*"([\s\S]*?)"\s*,\s*"prompt"\s*:/)
    const promptMatch = chunk.match(/"prompt"\s*:\s*"([\s\S]*)"/)

    if (!numMatch || !headlineMatch || !promptMatch) continue
    slides.push({
      slideNumber: Number(numMatch[1]),
      role: (roleMatch?.[1] as Slide["role"]) ?? "body",
      headline: cleanLooseString(headlineMatch[1]),
      prompt: cleanLooseMultiline(promptMatch[1]),
    })
  }

  return slides.length > 0 ? { caption: cleanLooseString(caption), slides } : null
}

function parseCarouselResponse(raw: string): { caption: string; slides: Slide[] } {
  // 0. Pre-sanitize: trim to the outermost { ... } block (drops chatter/fences
  // around the JSON), replace literal tab characters (illegal inside JSON
  // strings) with spaces, and remove null bytes. Strategies 1, 2, 5 and 6 run
  // against this cleaned candidate; the fence strategies (3, 4) keep using the
  // original raw, since the fences themselves live outside the braces.
  const s0start = raw.indexOf("{")
  const s0end = raw.lastIndexOf("}")
  const sanitized = (s0start !== -1 && s0end > s0start ? raw.slice(s0start, s0end + 1) : raw)
    .replace(/\t/g, " ")
    .replace(/\x00/g, "")

  // 1. Direct JSON.parse
  try {
    const parsed = JSON.parse(sanitized)
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
  const caption = extractStringValue(sanitized, "caption") ?? ""
  const slidesMatch = sanitized.match(/"slides"\s*:\s*(\[[\s\S]*?\])(?=\s*[,}])/)
  if (slidesMatch) {
    try {
      const slides = JSON.parse(slidesMatch[1])
      if (isValidSlideArray(slides)) {
        console.log("[generate/carousel-prompt] Parsed via: manual key extraction")
        return { caption, slides }
      }
    } catch {}
  }

  // 6. Aggressive recovery — for long slide prompts with bad escaping or raw
  // newlines that break JSON.parse in strategies 1-5.
  try {
    // 6a. Raw (unescaped) line breaks inside string values are illegal JSON
    // and a common cause of breakage — replace them with spaces and retry a
    // strict parse. (Escaped "\n" sequences are untouched.)
    try {
      const parsed = JSON.parse(sanitized.replace(/\r?\n/g, " "))
      if (typeof parsed.caption === "string" && isValidSlideArray(parsed.slides)) {
        console.log("[generate/carousel-prompt] Parsed via: newline sanitization")
        return { caption: parsed.caption, slides: parsed.slides }
      }
    } catch {}

    // 6b. Per-slide regex recovery — resilient to unescaped quotes in one slide.
    const recovered = recoverSlides(sanitized)
    if (recovered) {
      console.log("[generate/carousel-prompt] Parsed via: per-slide recovery")
      return recovered
    }

    // 6c. Last resort — lenient slides-array extraction: isolate everything from
    // "slides": [ to the last ] (greedy, so multi-line prompt fields full of
    // ## headers, quotes, and brackets can't end the match early) and run the
    // per-slide recovery on just that span.
    const arrMatch = sanitized.match(/"slides"\s*:\s*\[([\s\S]*)\]/)
    if (arrMatch) {
      const recoveredArr = recoverSlides(arrMatch[1])
      if (recoveredArr) {
        console.log("[generate/carousel-prompt] Parsed via: lenient slides-array recovery")
        return { caption, slides: recoveredArr.slides }
      }
    }
  } catch {}

  throw new Error("All parsing strategies exhausted")
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`generate:carousel-prompt:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  // Carousels are Pro-only. Defense-in-depth: the carousel page and FormatPicker
  // already gate this, but block it at the API too.
  if ((user.subscription?.plan ?? "FREE") === "FREE") {
    return NextResponse.json(
      { error: "Carousel generation requires Pro plan", requiresUpgrade: true },
      { status: 403 },
    )
  }

  let ideaId: string
  let caption: string
  let size: string
  let referenceImageBase64: string | undefined
  let referenceMediaType: string
  let userInstruction: string | undefined
  let currentSlides: string | undefined

  try {
    const body = await req.json()
    ideaId = body.ideaId
    caption = typeof body.caption === "string" ? body.caption : ""
    size = typeof body.size === "string" ? body.size : "4:5"
    referenceImageBase64 =
      typeof body.referenceImage === "string" ? body.referenceImage : undefined
    referenceMediaType =
      typeof body.referenceMediaType === "string" ? body.referenceMediaType : "image/jpeg"
    userInstruction =
      typeof body.userInstruction === "string" && body.userInstruction.trim()
        ? body.userInstruction.trim()
        : undefined
    currentSlides =
      typeof body.currentSlides === "string" && body.currentSlides.trim()
        ? body.currentSlides
        : undefined
    if (!ideaId) throw new Error("Missing ideaId")
    // TEMP diagnostic — confirm in Vercel logs exactly what the client sent.
    console.log("[ref-image] Reference image present:", !!referenceImageBase64, "length:", referenceImageBase64?.length ?? 0)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // Validate the reference image (size / type / magic bytes) before it ever
  // reaches Claude vision. Replaces the client-supplied values with the cleaned,
  // verified ones.
  if (referenceImageBase64) {
    const check = validateReferenceImage(referenceImageBase64, referenceMediaType)
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 })
    }
    referenceImageBase64 = check.data
    referenceMediaType = check.mediaType
  }

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

  const niche = user.profile?.industry ?? ""
  console.log(`[carousel] Profile used: industry=${niche}`)

  const breakdown = idea.breakdowns[0].outline as unknown as BreakdownOutline
  const hasReference = !!referenceImageBase64
  // Targeted edit when the user gave an instruction AND we have the current
  // slides to edit; otherwise full generation via the master prompt engine.
  // The edit prompt is self-contained (carries its own instructions + JSON
  // shape), so the master system prompt is only attached for full generations.
  const isEditMode = !!(userInstruction && currentSlides)
  const userText =
    userInstruction && currentSlides
      ? buildCarouselEditPrompt(currentSlides, userInstruction)
      : buildCarouselUserMessage(
          breakdown.refinedHook,
          breakdown.deepDive,
          caption,
          size,
          hasReference,
          niche,
          userInstruction,
        )

  let modelRaw: string
  try {
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      ...(referenceImageBase64
        ? [
            {
              type: "image_url" as const,
              image_url: {
                url: `data:${referenceMediaType || "image/jpeg"};base64,${referenceImageBase64.replace(/^data:image\/\w+;base64,/, "")}`,
                detail: "high" as const,
              },
            },
          ]
        : []),
      {
        type: "text" as const,
        text: userText,
      },
    ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: MAX_TOKENS,
      messages: [
        ...(isEditMode
          ? []
          : [{ role: "system" as const, content: CAROUSEL_MASTER_SYSTEM_PROMPT }]),
        { role: "user" as const, content: userContent },
      ],
    })

    console.log("[carousel-prompt] GPT-4o finish_reason:", response.choices[0]?.finish_reason)
    console.log(
      "[carousel-prompt] GPT-4o tokens:",
      response.usage?.completion_tokens,
      "/",
      MAX_TOKENS,
    )

    // Near-ceiling warning — if output tokens approach MAX_TOKENS the response
    // was probably truncated mid-slide.
    const completionTokens = response.usage?.completion_tokens ?? 0
    if (completionTokens > TOKEN_WARN_THRESHOLD) {
      console.warn("[carousel-prompt] WARNING: Near token ceiling:", completionTokens)
    }

    modelRaw = response.choices[0]?.message?.content ?? ""
  } catch (err) {
    // Map provider failures to friendly, actionable messages instead of a
    // generic 502 — the client surfaces `error` directly to the user.
    // Duck-typed on status/code rather than SDK error classes (OpenAI's
    // APIError attaches a numeric `status`).
    const e = err as { status?: number; code?: string; message?: string }
    console.error("[carousel-prompt] GPT-4o API error:", e?.message ?? err)
    if (e?.status === 429) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 },
      )
    }
    if (e?.status === 529 || e?.status === 503) {
      return NextResponse.json(
        { error: "The AI service is busy right now. Please try again in a minute." },
        { status: 503 },
      )
    }
    if (e?.status === 504 || e?.code === "ETIMEDOUT") {
      return NextResponse.json(
        { error: "Generation timed out. Please try again." },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { error: "Something went wrong generating the carousel. Please try again." },
      { status: 500 },
    )
  }

  if (!modelRaw.trimEnd().endsWith("}")) {
    console.warn("[generate/carousel-prompt] WARNING: Response may be truncated — does not end with }")
    console.log("[carousel-prompt] Raw response length:", modelRaw.length, "/ max_tokens:", MAX_TOKENS)
  }

  let parsed: { caption: string; slides: Slide[] }
  try {
    parsed = parseCarouselResponse(modelRaw)
  } catch {
    console.error("[generate/carousel-prompt] All parse strategies failed. Raw:\n", modelRaw)
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 })
  }

  if (!parsed.slides.length) {
    return NextResponse.json({ error: "No slides found in AI response" }, { status: 502 })
  }

  console.log("[carousel-prompt] Final slide count:", parsed.slides.length)

  // Edit mode legitimately returns only the changed slides; a full generation
  // returning fewer than 7 usually means truncation or a partial parse recovery.
  if (!isEditMode && parsed.slides.length < 7) {
    console.warn(
      `[carousel-prompt] WARNING: Only ${parsed.slides.length} slides generated, expected 7-9`,
    )
  }

  return NextResponse.json({ caption: parsed.caption, slides: parsed.slides })
}
