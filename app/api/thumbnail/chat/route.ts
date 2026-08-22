import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"
import { getCurrentUser } from "@/lib/auth"
import { THUMBNAIL_MASTER_SYSTEM_PROMPT } from "@/lib/ai/prompts/thumbnailPrompt"
import { validateReferenceImage } from "@/lib/validateImage"
import { hasGenerationBalance } from "@/lib/credits"
import type {
  ThumbnailBlueprint,
  ThumbnailMainTextRegion,
  ThumbnailSecondaryTextRegion,
  ThumbnailReferenceComposition,
  ThumbnailAdaptedContent,
} from "@/lib/types/thumbnail"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Analysis + a vision call can run past the platform's shorter default
// function timeout; matches the other reference-image routes.
export const maxDuration = 60

// Multi-turn — one full thumbnail creation is ~3-6 calls to this route, so the
// cap is higher than the single-shot prompt routes.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  analytics: false,
})

interface HistoryTurn {
  role: "user" | "assistant"
  content: string
  imageBase64?: string
  imageMediaType?: string
}

interface ThumbnailChatResponse {
  status: "asking" | "ready"
  message: string
  question: { topic: string; options: string[] } | null
  blueprint: ThumbnailBlueprint | null
}

// GPT-4o sometimes refuses the task outright instead of erroring. A real
// generation is JSON starting with "{" — refusal prose shows up at the very
// start of the response, so only the opening chunk is checked.
function isRefusal(text: string): boolean {
  const refusalPhrases = [
    "i'm sorry",
    "i cannot",
    "i can't assist",
    "i'm not able",
    "i won't",
    "i am unable",
    "i apologize",
    "not able to help",
    "can't help with",
  ]
  const opening = text.toLowerCase().trim().slice(0, 300)
  return refusalPhrases.some(
    (phrase) => opening.startsWith(phrase) || opening.includes(phrase),
  )
}

function isNullableString(val: unknown): val is string | null {
  return val === null || typeof val === "string"
}

function isValidMainText(val: unknown): val is ThumbnailMainTextRegion {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return typeof v.position === "string" && typeof v.size === "string" && typeof v.color === "string"
}

function isValidSecondaryText(val: unknown): val is ThumbnailSecondaryTextRegion {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return isNullableString(v.position) && isNullableString(v.size) && isNullableString(v.color)
}

function isValidReferenceComposition(val: unknown): val is ThumbnailReferenceComposition {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return (
    typeof v.subjectCount === "number" &&
    typeof v.subjectPosition === "string" &&
    typeof v.subjectScale === "string" &&
    typeof v.background === "string" &&
    isValidMainText(v.mainText) &&
    (v.secondaryText === null || v.secondaryText === undefined || isValidSecondaryText(v.secondaryText)) &&
    typeof v.additionalObjects === "string" &&
    typeof v.compositionRule === "string"
  )
}

function isValidAdaptedContent(val: unknown): val is ThumbnailAdaptedContent {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return (
    typeof v.mainSubjectDescription === "string" &&
    typeof v.mainHeadlineText === "string" &&
    (v.secondaryText === undefined || isNullableString(v.secondaryText)) &&
    typeof v.emotion === "string"
  )
}

function isValidBlueprint(val: unknown): val is ThumbnailBlueprint {
  if (typeof val !== "object" || val === null) return false
  const v = val as Record<string, unknown>
  return (
    isValidReferenceComposition(v.referenceComposition) &&
    isValidAdaptedContent(v.adaptedContent) &&
    (v.additionalGuidance === undefined || isNullableString(v.additionalGuidance))
  )
}

// Fills optional-but-required-shape fields (secondaryText's null defaults)
// so downstream consumers never have to distinguish "omitted" from "null".
function normalizeBlueprint(bp: ThumbnailBlueprint): ThumbnailBlueprint {
  return {
    referenceComposition: {
      ...bp.referenceComposition,
      secondaryText: bp.referenceComposition.secondaryText ?? null,
    },
    adaptedContent: {
      ...bp.adaptedContent,
      secondaryText: bp.adaptedContent.secondaryText ?? null,
    },
    additionalGuidance: bp.additionalGuidance ?? null,
  }
}

function isValidQuestion(val: unknown): val is { topic: string; options: string[] } {
  if (typeof val !== "object" || val === null) return false
  const q = val as { topic?: unknown; options?: unknown }
  return (
    typeof q.topic === "string" &&
    Array.isArray(q.options) &&
    q.options.every((o) => typeof o === "string")
  )
}

function isValidResponse(val: unknown): val is ThumbnailChatResponse {
  if (typeof val !== "object" || val === null) return false
  const r = val as Record<string, unknown>
  if (r.status !== "asking" && r.status !== "ready") return false
  if (typeof r.message !== "string") return false
  if (r.question !== null && r.question !== undefined && !isValidQuestion(r.question)) return false
  if (r.blueprint !== null && r.blueprint !== undefined && !isValidBlueprint(r.blueprint)) return false
  return true
}

function normalizeResponse(val: ThumbnailChatResponse): ThumbnailChatResponse {
  return {
    status: val.status,
    message: val.message,
    question: val.status === "asking" ? val.question ?? null : null,
    blueprint: val.status === "ready" && val.blueprint ? normalizeBlueprint(val.blueprint) : null,
  }
}

function parseThumbnailResponse(raw: string): ThumbnailChatResponse {
  // 1. Direct JSON.parse
  try {
    const parsed = JSON.parse(raw)
    if (isValidResponse(parsed)) return normalizeResponse(parsed)
  } catch {}

  // 2. Outermost { ... } block
  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1))
      if (isValidResponse(parsed)) return normalizeResponse(parsed)
    }
  } catch {}

  // 3. ```json block
  try {
    const match = raw.match(/```json\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (isValidResponse(parsed)) return normalizeResponse(parsed)
    }
  } catch {}

  // 4. ``` block (no language tag)
  try {
    const match = raw.match(/```\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (isValidResponse(parsed)) return normalizeResponse(parsed)
    }
  } catch {}

  throw new Error("All parsing strategies exhausted")
}

// Builds the OpenAI content parts for a single history turn.
function turnToOpenAIContent(turn: HistoryTurn): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = []
  if (turn.imageBase64) {
    parts.push({
      type: "image_url" as const,
      image_url: {
        url: `data:${turn.imageMediaType || "image/jpeg"};base64,${turn.imageBase64}`,
        detail: "high" as const,
      },
    })
  }
  parts.push({ type: "text" as const, text: turn.content })
  return parts
}

function turnToClaudeContent(turn: HistoryTurn): Anthropic.MessageParam["content"] {
  const parts: Anthropic.MessageParam["content"] = []
  if (turn.imageBase64) {
    parts.push({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: (turn.imageMediaType || "image/jpeg") as
          | "image/jpeg"
          | "image/png"
          | "image/webp",
        data: turn.imageBase64,
      },
    })
  }
  parts.push({ type: "text" as const, text: turn.content })
  return parts
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId: clerkId } = await auth()
  const { success } = await ratelimit.limit(`thumbnail:chat:${clerkId}`)
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit reached. Please try again later." },
      { status: 429 },
    )
  }

  if (!(await hasGenerationBalance(user.id))) {
    return NextResponse.json({ error: "You're out of credits." }, { status: 402 })
  }

  let conversationHistory: HistoryTurn[]
  let referenceImageBase64: string
  let referenceImageMediaType: string
  let videoContent: string

  try {
    const body = await req.json()
    conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : []
    referenceImageBase64 = typeof body.referenceImageBase64 === "string" ? body.referenceImageBase64 : ""
    referenceImageMediaType =
      typeof body.referenceImageMediaType === "string" ? body.referenceImageMediaType : "image/jpeg"
    videoContent = typeof body.videoContent === "string" ? body.videoContent.trim() : ""
    if (!referenceImageBase64) throw new Error("Missing referenceImageBase64")
    if (!videoContent) throw new Error("Missing videoContent")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const refCheck = validateReferenceImage(referenceImageBase64, referenceImageMediaType)
  if (!refCheck.ok) {
    return NextResponse.json({ error: refCheck.error }, { status: 400 })
  }
  referenceImageBase64 = refCheck.data
  referenceImageMediaType = refCheck.mediaType

  // Validate + clean any image the user uploaded mid-conversation (e.g. a
  // "Person 1" photo answering a question) before it reaches vision APIs.
  for (const turn of conversationHistory) {
    if (turn.role === "user" && turn.imageBase64) {
      const check = validateReferenceImage(turn.imageBase64, turn.imageMediaType || "image/jpeg")
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 })
      }
      turn.imageBase64 = check.data
      turn.imageMediaType = check.mediaType
    }
  }

  // Turn 0 is always reconstructed from the reference image + video content
  // (sent on every call) so the route stays stateless; conversationHistory
  // holds everything from the model's first reply onward.
  const initialTurn: HistoryTurn = {
    role: "user",
    content: `Video content (title/script/topic/key points): ${videoContent}`,
    imageBase64: referenceImageBase64,
    imageMediaType: referenceImageMediaType,
  }
  const allTurns = [initialTurn, ...conversationHistory]

  let modelRaw = ""
  let usedFallback = false

  // PRIMARY: GPT-4o. Any refusal or API error falls through to Claude below.
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system" as const, content: THUMBNAIL_MASTER_SYSTEM_PROMPT },
      ...allTurns.map((turn) =>
        turn.role === "assistant"
          ? { role: "assistant" as const, content: turn.content }
          : { role: "user" as const, content: turnToOpenAIContent(turn) },
      ),
    ]

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages,
    })

    console.log("[thumbnail/chat] GPT-4o finish_reason:", response.choices[0]?.finish_reason)

    const gptRaw = response.choices[0]?.message?.content ?? ""

    if (isRefusal(gptRaw)) {
      console.warn("[thumbnail/chat] GPT-4o refused request, falling back to Claude")
      usedFallback = true
    } else {
      modelRaw = gptRaw
    }
  } catch (err) {
    const e = err as { message?: string }
    console.warn("[thumbnail/chat] GPT-4o error, falling back to Claude:", e?.message ?? err)
    usedFallback = true
  }

  // FALLBACK: Claude, fed the same system + turn history.
  if (usedFallback) {
    try {
      const claudeMessages: Anthropic.MessageParam[] = allTurns.map((turn) => ({
        role: turn.role,
        content: turn.role === "assistant" ? turn.content : turnToClaudeContent(turn),
      }))

      const claudeResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: THUMBNAIL_MASTER_SYSTEM_PROMPT,
        messages: claudeMessages,
      })

      console.log("[thumbnail/chat] Claude fallback stop_reason:", claudeResponse.stop_reason)

      modelRaw = claudeResponse.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
    } catch (err) {
      const e = err as { message?: string }
      console.error("[thumbnail/chat] Claude fallback also failed:", e?.message ?? err)
      return NextResponse.json(
        { error: "Something went wrong analyzing the reference. Please try again." },
        { status: 500 },
      )
    }
  }

  console.log("[thumbnail/chat] Model used:", usedFallback ? "Claude (fallback)" : "GPT-4o")

  let parsed: ThumbnailChatResponse
  try {
    parsed = parseThumbnailResponse(modelRaw)
  } catch {
    console.error("[thumbnail/chat] All parse strategies failed. Raw:\n", modelRaw)
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 502 })
  }

  return NextResponse.json(parsed)
}
