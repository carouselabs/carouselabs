// lib/ai/commentModel.ts — model call, response parsing and output validation
// shared by the Comment extension's two generation routes
// (app/api/ext/generate and app/api/ext/rewrite). Extracted so the lenient
// parse ladder and the sanitiser exist once: a rewrite that stripped hashtags
// differently from a fresh generate would be a quiet inconsistency.
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"

// The SDK defaults (10-minute timeout, 2 retries each) let one Generate —
// two attempts, each primary then fallback — run for many minutes while the
// user watches a spinner. Every call below also gets its own, much shorter
// limit (see callLimit).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 30_000, maxRetries: 1 })

// Time limits, so the side panel is never left showing "Writing…": a request
// either answers or fails, and the panel says so and offers Try again.
//
// One Generate, rewrite, note, message or profile test gets this long for
// all its attempts and both models together. The panel waits 60s
// (src/lib/api.ts), so it always hears the answer or the failure.
export const GENERATION_BUDGET_MS = 40_000
// Luna normally answers in a second or two; past this it is stuck, and Haiku
// gets the rest of the time.
const LUNA_CALL_MS = 15_000
const HAIKU_CALL_MS = 20_000
// A streamed answer that goes quiet this long (from the request, or between
// pieces) has stalled: the SDK's own timeout stops at the first byte, so
// without this a stall mid-answer would wait forever.
export const STREAM_IDLE_MS = 10_000
// With less than this left, no new model call is started.
const MIN_CALL_MS = 3_000

// The request's time budget ran out before another model call could start.
export class GenerationTimeout extends Error {
  constructor() {
    super("Out of time for this generation")
    this.name = "GenerationTimeout"
  }
}

export function generationDeadline(): number {
  return Date.now() + GENERATION_BUDGET_MS
}

// How long one model call may take: its own cap, cut to what is left of the
// request's budget.
function callLimit(cap: number, deadline: number | undefined): number {
  const left = deadline === undefined ? cap : Math.min(cap, deadline - Date.now())
  if (left < MIN_CALL_MS) throw new GenerationTimeout()
  return left
}

// Why a call was stopped, for the log line that says so.
class CallStopped extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "CallStopped"
  }
}

// Runs one model call under its limit: it is aborted when the limit passes,
// when a stream goes quiet for STREAM_IDLE_MS (each `alive()` restarts that
// clock; calls that don't stream never call it, so it is only armed for
// streams), or when the caller's own signal aborts.
async function limited<T>(
  limitMs: number,
  outer: AbortSignal | undefined,
  streaming: boolean,
  run: (signal: AbortSignal, alive: () => void) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const stop = (reason: string) => () => controller.abort(new CallStopped(reason))
  const limit = setTimeout(stop(`no answer within ${Math.round(limitMs / 1000)}s`), limitMs)
  let idle: ReturnType<typeof setTimeout> | undefined
  const alive = () => {
    if (!streaming) return
    clearTimeout(idle)
    idle = setTimeout(stop(`stream went quiet for ${STREAM_IDLE_MS / 1000}s`), STREAM_IDLE_MS)
  }
  alive()
  const forward = () => controller.abort(outer?.reason)
  if (outer?.aborted) forward()
  else outer?.addEventListener("abort", forward, { once: true })
  try {
    return await run(controller.signal, alive)
  } catch (err) {
    // Report a limit by name rather than as the SDK's generic abort error.
    const reason = controller.signal.reason
    if (!outer?.aborted && reason instanceof CallStopped) throw reason
    throw err
  } finally {
    clearTimeout(limit)
    clearTimeout(idle)
    outer?.removeEventListener("abort", forward)
  }
}

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

export interface ModelCallOptions {
  // From generationDeadline(): the whole request's time budget, shared by
  // every attempt. Throws GenerationTimeout once too little is left.
  deadline?: number
}

// Luna primary, Claude Haiku 4.5 on refusal, error or timeout. `label` only
// tags the log lines so the routes stay distinguishable in output.
export async function callCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
  { deadline }: ModelCallOptions = {},
): Promise<string> {
  try {
    const raw = await limited(callLimit(LUNA_CALL_MS, deadline), undefined, false, async (signal) => {
      const response = await openai.chat.completions.create(lunaRequest(systemMessage, userMessage), {
        signal,
        maxRetries: 0,
      })
      return response.choices[0]?.message?.content ?? ""
    })
    if (!isRefusal(raw) && raw.trim()) return raw
    console.warn(`[${label}] Luna refused or returned empty, falling back to Claude Haiku`)
  } catch (err) {
    if (err instanceof GenerationTimeout) throw err
    const e = err as { message?: string }
    console.warn(`[${label}] Luna error, falling back to ${FALLBACK_MODEL}:`, e?.message ?? err)
  }

  return limited(callLimit(HAIKU_CALL_MS, deadline), undefined, false, async (signal) => {
    const response = await anthropic.messages.create(
      {
        model: FALLBACK_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
      },
      { signal, maxRetries: 0 },
    )
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
  })
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

export interface ModelStreamOptions extends ModelCallOptions {
  // The whole response so far, each time more of it arrives.
  onRaw?: (raw: string) => void
  // Luna failed after sending some text and Haiku is starting over, so
  // anything shown from Luna's partial response must be forgotten.
  onReset?: () => void
  // Aborting stops generation mid-response; the call then rejects.
  signal?: AbortSignal
}

// callCommentModel, streamed: same models, same fallback rule (Luna, then
// Haiku on error, refusal, empty output, a stall or a timeout), but the text
// is handed over as it arrives instead of when the model is done.
export async function streamCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
  { onRaw, onReset, signal, deadline }: ModelStreamOptions = {},
): Promise<ModelStreamResult> {
  const start = performance.now()
  let raw = ""
  let ttftMs: number | null = null

  try {
    await limited(callLimit(LUNA_CALL_MS, deadline), signal, true, async (callSignal, alive) => {
      const stream = await openai.chat.completions.create(
        { ...lunaRequest(systemMessage, userMessage), stream: true },
        { signal: callSignal, maxRetries: 0 },
      )
      for await (const chunk of stream) {
        alive()
        const delta = chunk.choices[0]?.delta?.content
        if (!delta) continue
        ttftMs ??= performance.now() - start
        raw += delta
        onRaw?.(raw)
      }
    })
    if (!isRefusal(raw) && raw.trim()) {
      return { raw, model: PRIMARY_MODEL, ttftMs, totalMs: performance.now() - start }
    }
    console.warn(`[${label}] Luna refused or returned empty, falling back to Claude Haiku`)
  } catch (err) {
    if (signal?.aborted || err instanceof GenerationTimeout) throw err
    const e = err as { message?: string }
    console.warn(`[${label}] Luna error, falling back to ${FALLBACK_MODEL}:`, e?.message ?? err)
  }

  if (raw) onReset?.()
  raw = ""
  ttftMs = null

  await limited(callLimit(HAIKU_CALL_MS, deadline), signal, true, async (callSignal, alive) => {
    const stream = await anthropic.messages.create(
      {
        model: FALLBACK_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemMessage,
        messages: [{ role: "user", content: userMessage }],
        stream: true,
      },
      { signal: callSignal, maxRetries: 0 },
    )
    for await (const event of stream) {
      alive()
      if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue
      ttftMs ??= performance.now() - start
      raw += event.delta.text
      onRaw?.(raw)
    }
  })
  return { raw, model: FALLBACK_MODEL, ttftMs, totalMs: performance.now() - start }
}
