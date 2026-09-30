// lib/ai/commentModel.ts — model call, response parsing and output validation
// shared by the Comment extension's two generation routes
// (app/api/ext/generate and app/api/ext/rewrite). Extracted so the lenient
// parse ladder and the sanitiser exist once: a rewrite that stripped hashtags
// differently from a fresh generate would be a quiet inconsistency.
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

// The SDK defaults (10-minute timeout, 2 retries each) let one Generate —
// two attempts, each primary then fallback — run for many minutes while the
// user watches a spinner. A comment-sized request that hasn't answered in 30s
// is better failed over to the other model.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 })

// Luna primary, Claude Haiku 4.5 as fallback. Both are the cheap/fast tier of
// their respective families rather than a flagship model: a comment is a few
// dozen words and the user is watching a side panel spinner, so latency
// matters more here than headroom.
export const PRIMARY_MODEL = "gpt-6-luna"
// Only called if Luna errors or refuses — same cost/latency tier as
// PRIMARY_MODEL, not a bigger fallback model.
export const FALLBACK_MODEL = "claude-haiku-4-5-20251001"

// A comment is a few dozen words; this is a runaway guard, not a target.
const MAX_OUTPUT_TOKENS = 1024

function lunaRequest(systemMessage: string, userMessage: string) {
  return {
    model: PRIMARY_MODEL,
    // Luna rejects `max_tokens` outright (400 "Unsupported parameter ... Use
    // 'max_completion_tokens' instead"). With `max_tokens` here, every call
    // failed and silently fell back to Haiku, a full round trip later.
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    // Luna is a reasoning model (default effort "medium"); reasoning tokens
    // would eat into the output budget and add latency for no benefit on a
    // task this short, so it's turned off — same "latency over headroom" call
    // FALLBACK_MODEL (Haiku) already makes for its own tier.
    reasoning_effort: "none" as const,
    messages: [
      { role: "system" as const, content: systemMessage },
      { role: "user" as const, content: userMessage },
    ],
  }
}

// Same check as app/api/generate/image-prompt: a real generation is JSON
// starting with "{", so refusal prose only ever appears at the very start.
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
  return refusalPhrases.some((phrase) => opening.startsWith(phrase) || opening.includes(phrase))
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

// Same lenient ladder as the carousel/image prompt routes, narrowed to the
// single `comment` field.
export function parseComment(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.comment === "string") return parsed.comment
  } catch {}

  try {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1))
      if (typeof parsed.comment === "string") return parsed.comment
    }
  } catch {}

  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      const parsed = JSON.parse(match[1].trim())
      if (typeof parsed.comment === "string") return parsed.comment
    }
  } catch {}

  return extractStringValue(raw, "comment")
}

// Lives in a dependency-free module so it can also clean text mid-stream.
export { sanitizeComment } from "@/lib/ai/commentText"

// Luna primary, Claude Haiku 4.5 on refusal or error. `label` only tags the
// log lines so the two routes stay distinguishable in output.
export async function callCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create(lunaRequest(systemMessage, userMessage))

    const raw = response.choices[0]?.message?.content ?? ""
    if (!isRefusal(raw) && raw.trim()) return raw
    console.warn(`[${label}] Luna refused or returned empty, falling back to Claude Haiku`)
  } catch (err) {
    const e = err as { message?: string }
    console.warn(`[${label}] Luna error, falling back to ${FALLBACK_MODEL}:`, e?.message ?? err)
  }

  const response = await anthropic.messages.create({
    model: FALLBACK_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemMessage,
    messages: [{ role: "user", content: userMessage }],
  })

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
}

export interface ModelStreamResult {
  raw: string
  // The model that actually produced `raw`.
  model: string
  // From the start of the call to the first token of the model that answered,
  // including any time spent on a failed Luna attempt: what the user waited.
  ttftMs: number | null
  totalMs: number
}

export interface ModelStreamOptions {
  // The whole response so far, each time more of it arrives.
  onRaw?: (raw: string) => void
  // Luna failed after sending some text and Haiku is starting over, so
  // anything shown from Luna's partial response must be forgotten.
  onReset?: () => void
  // Aborting stops generation mid-response; the call then rejects.
  signal?: AbortSignal
}

// callCommentModel, streamed: same models, same fallback rule (Luna, then
// Haiku on error, refusal or empty output), but the text is handed over as it
// arrives instead of when the model is done.
export async function streamCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
  { onRaw, onReset, signal }: ModelStreamOptions = {},
): Promise<ModelStreamResult> {
  const start = performance.now()
  let raw = ""
  let ttftMs: number | null = null

  try {
    const stream = await openai.chat.completions.create(
      { ...lunaRequest(systemMessage, userMessage), stream: true },
      { signal },
    )
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (!delta) continue
      ttftMs ??= performance.now() - start
      raw += delta
      onRaw?.(raw)
    }
    if (!isRefusal(raw) && raw.trim()) {
      return { raw, model: PRIMARY_MODEL, ttftMs, totalMs: performance.now() - start }
    }
    console.warn(`[${label}] Luna refused or returned empty, falling back to Claude Haiku`)
  } catch (err) {
    if (signal?.aborted) throw err
    const e = err as { message?: string }
    console.warn(`[${label}] Luna error, falling back to ${FALLBACK_MODEL}:`, e?.message ?? err)
  }

  if (raw) onReset?.()
  raw = ""
  ttftMs = null

  const stream = await anthropic.messages.create(
    {
      model: FALLBACK_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    },
    { signal },
  )
  for await (const event of stream) {
    if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue
    ttftMs ??= performance.now() - start
    raw += event.delta.text
    onRaw?.(raw)
  }
  return { raw, model: FALLBACK_MODEL, ttftMs, totalMs: performance.now() - start }
}
