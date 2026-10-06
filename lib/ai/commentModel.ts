// lib/ai/commentModel.ts — model call, response parsing and output validation
// shared by the Comment extension's two generation routes
// (app/api/ext/generate and app/api/ext/rewrite). Extracted so the lenient
// parse ladder and the sanitiser exist once: a rewrite that stripped hashtags
// differently from a fresh generate would be a quiet inconsistency.
//
// Each feature's AI model is chosen in admin → Engage → AI (GPT Luna unless
// changed); the other model is the backup. Every call is recorded for that
// page — model, tokens, time, how it ended (lib/engage/aiUsage.ts) — never
// the text itself, and never in a way that can slow or fail the request.
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { AI_MODELS, FALLBACK_MODEL, PRIMARY_MODEL, type AiModelKey } from "@/lib/ai/models"
import { recordAiCall, type AiAttempt, type AiCaller, type AiOutcome } from "@/lib/engage/aiUsage"
import { featureOfUsageKind } from "@/lib/engage/features"
import { loadGlobalSettings } from "@/lib/engage/settings"

export { FALLBACK_MODEL, PRIMARY_MODEL }

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
// gets the rest of the time. Each model keeps its own cap whichever goes first.
const CALL_MS: Record<AiModelKey, number> = { luna: 15_000, haiku: 20_000 }
// A streamed answer that goes quiet this long (from the request, or between
// pieces) has stalled: the SDK's own timeout stops at the first byte, so
// without this a stall mid-answer would wait forever.
export const STREAM_IDLE_MS = 10_000
// When a backup model is left: a streamed answer with no words this long
// after the request (normal is about a second) is handed to the backup
// rather than waited for, and a whole non-streamed answer gets this long.
// The last model left keeps the full limits: waiting beats failing.
export const FIRST_TEXT_MS = 4_000
export const PRIMARY_COMPLETE_MS = 8_000

// FIRST_TEXT_MS can be tuned from measurements (admin → Engage → AI shows
// each model's first-token times) without a code change: ENGAGE_FIRST_TEXT_MS,
// whole milliseconds from 1000 to 15000; anything else is ignored. Read on
// every call, so a new value applies from the next deployment that has it.
export function firstTextMs(): number {
  const raw = Number(process.env.ENGAGE_FIRST_TEXT_MS)
  return Number.isInteger(raw) && raw >= 1_000 && raw <= 15_000 ? raw : FIRST_TEXT_MS
}
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
// streams), when `firstTextMs` passes before `sawText()` (the first words),
// or when the caller's own signal aborts.
async function limited<T>(
  limitMs: number,
  outer: AbortSignal | undefined,
  streaming: boolean,
  run: (signal: AbortSignal, alive: () => void, sawText: () => void) => Promise<T>,
  firstTextMs?: number,
): Promise<T> {
  const controller = new AbortController()
  const stop = (reason: string) => () => controller.abort(new CallStopped(reason))
  const limit = setTimeout(stop(`no answer within ${Math.round(limitMs / 1000)}s`), limitMs)
  let firstText: ReturnType<typeof setTimeout> | undefined =
    firstTextMs === undefined ? undefined : setTimeout(stop(`no words within ${firstTextMs / 1000}s`), firstTextMs)
  const sawText = () => {
    clearTimeout(firstText)
    firstText = undefined
  }
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
    return await run(controller.signal, alive, sawText)
  } catch (err) {
    // Report a limit by name rather than as the SDK's generic abort error.
    const reason = controller.signal.reason
    if (!outer?.aborted && reason instanceof CallStopped) throw reason
    throw err
  } finally {
    clearTimeout(limit)
    clearTimeout(idle)
    clearTimeout(firstText)
    outer?.removeEventListener("abort", forward)
  }
}

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

function haikuRequest(systemMessage: string, userMessage: string) {
  return {
    model: FALLBACK_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemMessage,
    messages: [{ role: "user" as const, content: userMessage }],
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
  // Who asked and for what: picks the feature's model (admin → Engage → AI)
  // and records each call for that page. Without it: Luna first, unrecorded.
  engage?: AiCaller
}

// The order to try the models in: the feature's chosen model, then the other.
async function modelOrder(engage: AiCaller | undefined): Promise<[AiModelKey, AiModelKey]> {
  const first = engage ? (await loadGlobalSettings()).models[featureOfUsageKind(engage.kind)] : "luna"
  return first === "haiku" ? ["haiku", "luna"] : ["luna", "haiku"]
}

function failureOutcome(err: unknown, signal?: AbortSignal): AiOutcome {
  if (signal?.aborted) return "cancelled"
  return err instanceof CallStopped ? "timeout" : "error"
}

// A refusal or nothing at all counts as not answering: the other model gets
// a turn (the last model's answer is returned either way, as before).
function answerOutcome(raw: string): AiOutcome {
  if (!raw.trim()) return "empty"
  return isRefusal(raw) ? "refused" : "ok"
}

const pause = (ms: number) => Math.round(ms)

// One whole (not streamed) answer from one model, with the tokens it used.
async function complete(
  key: AiModelKey,
  systemMessage: string,
  userMessage: string,
  signal: AbortSignal,
  usage: { input: number | null; output: number | null },
): Promise<string> {
  if (key === "luna") {
    const response = await openai.chat.completions.create(lunaRequest(systemMessage, userMessage), { signal, maxRetries: 0 })
    usage.input = response.usage?.prompt_tokens ?? null
    usage.output = response.usage?.completion_tokens ?? null
    return response.choices[0]?.message?.content ?? ""
  }
  const response = await anthropic.messages.create(haikuRequest(systemMessage, userMessage), { signal, maxRetries: 0 })
  usage.input = response.usage?.input_tokens ?? null
  usage.output = response.usage?.output_tokens ?? null
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
}

// The chosen model first, the other on refusal, error or timeout; returns
// what was written and the model that wrote it. `label` tags the log lines
// and the recorded calls so the routes stay distinguishable.
export async function callCommentModelWithInfo(
  systemMessage: string,
  userMessage: string,
  label: string,
  { deadline, engage }: ModelCallOptions = {},
): Promise<{ raw: string; model: string }> {
  const order = await modelOrder(engage)
  for (let i = 0; i < order.length; i += 1) {
    const key = order[i]
    const last = i === order.length - 1
    // While a backup is left, a stuck first model is cut off sooner.
    const limitMs = callLimit(last ? CALL_MS[key] : Math.min(CALL_MS[key], PRIMARY_COMPLETE_MS), deadline)
    const usage = { input: null as number | null, output: null as number | null }
    const start = performance.now()
    const note = (outcome: AiOutcome) => {
      if (!engage) return
      const attempt: AiAttempt = {
        model: AI_MODELS[key].id,
        fallback: i > 0,
        streamed: false,
        outcome,
        inputTokens: usage.input,
        outputTokens: usage.output,
        firstTokenMs: null,
        ms: pause(performance.now() - start),
      }
      recordAiCall(engage, label, attempt)
    }
    try {
      const raw = await limited(limitMs, undefined, false, (signal) => complete(key, systemMessage, userMessage, signal, usage))
      const outcome = answerOutcome(raw)
      note(outcome)
      if (outcome === "ok" || last) return { raw, model: AI_MODELS[key].id }
      console.warn(`[${label}] ${AI_MODELS[key].label} refused or returned empty, falling back to ${AI_MODELS[order[i + 1]].label}`)
    } catch (err) {
      note(failureOutcome(err))
      if (last) throw err
      const e = err as { message?: string }
      console.warn(`[${label}] ${AI_MODELS[key].label} error, falling back to ${AI_MODELS[order[i + 1]].id}:`, e?.message ?? err)
    }
  }
  throw new Error("unreachable")
}

// callCommentModelWithInfo, for callers that only need the text.
export async function callCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
  options: ModelCallOptions = {},
): Promise<string> {
  return (await callCommentModelWithInfo(systemMessage, userMessage, label, options)).raw
}

export interface ModelStreamResult {
  raw: string
  // The model that actually produced `raw`.
  model: string
  // From the start of the call to the first token of the model that answered,
  // including any time spent on a failed first attempt: what the user waited.
  ttftMs: number | null
  totalMs: number
}

export interface ModelStreamOptions extends ModelCallOptions {
  // The whole response so far, each time more of it arrives.
  onRaw?: (raw: string) => void
  // The first model failed after sending some text and the backup is starting
  // over, so anything shown from the partial response must be forgotten.
  onReset?: () => void
  // Aborting stops generation mid-response; the call then rejects.
  signal?: AbortSignal
}

// One model's streamed answer: each piece of text to `onText`, the tokens it
// used into `usage` (Luna sends them in its last chunk when asked; Claude in
// message_start and message_delta).
async function streamOne(
  key: AiModelKey,
  systemMessage: string,
  userMessage: string,
  signal: AbortSignal,
  alive: () => void,
  onText: (text: string) => void,
  usage: { input: number | null; output: number | null },
): Promise<void> {
  if (key === "luna") {
    const stream = await openai.chat.completions.create(
      { ...lunaRequest(systemMessage, userMessage), stream: true, stream_options: { include_usage: true } },
      { signal, maxRetries: 0 },
    )
    for await (const chunk of stream) {
      alive()
      if (chunk.usage) {
        usage.input = chunk.usage.prompt_tokens ?? null
        usage.output = chunk.usage.completion_tokens ?? null
      }
      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) onText(delta)
    }
    return
  }
  const stream = await anthropic.messages.create({ ...haikuRequest(systemMessage, userMessage), stream: true }, { signal, maxRetries: 0 })
  for await (const event of stream) {
    alive()
    if (event.type === "message_start") usage.input = event.message?.usage?.input_tokens ?? null
    else if (event.type === "message_delta") usage.output = event.usage?.output_tokens ?? null
    else if (event.type === "content_block_delta" && event.delta.type === "text_delta") onText(event.delta.text)
  }
}

// callCommentModel, streamed: same models, same fallback rule (the chosen
// model, then the other on error, refusal, empty output, a stall or a
// timeout), but the text is handed over as it arrives.
export async function streamCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
  { onRaw, onReset, signal, deadline, engage }: ModelStreamOptions = {},
): Promise<ModelStreamResult> {
  const start = performance.now()
  const order = await modelOrder(engage)
  let raw = ""
  let ttftMs: number | null = null

  for (let i = 0; i < order.length; i += 1) {
    const key = order[i]
    const last = i === order.length - 1
    if (i > 0) {
      if (raw) onReset?.()
      raw = ""
      ttftMs = null
    }
    const limitMs = callLimit(CALL_MS[key], deadline)
    const usage = { input: null as number | null, output: null as number | null }
    const callStart = performance.now()
    let firstTokenMs: number | null = null
    const note = (outcome: AiOutcome) => {
      if (!engage) return
      recordAiCall(engage, label, {
        model: AI_MODELS[key].id,
        fallback: i > 0,
        streamed: true,
        outcome,
        inputTokens: usage.input,
        outputTokens: usage.output,
        firstTokenMs: firstTokenMs === null ? null : pause(firstTokenMs),
        ms: pause(performance.now() - callStart),
      })
    }
    try {
      await limited(
        limitMs,
        signal,
        true,
        (callSignal, alive, sawText) =>
          streamOne(key, systemMessage, userMessage, callSignal, alive, (text) => {
            if (text) sawText()
            firstTokenMs ??= performance.now() - callStart
            ttftMs ??= performance.now() - start
            raw += text
            onRaw?.(raw)
          }, usage),
        // A slow start hands over to the backup while one is left.
        last ? undefined : firstTextMs(),
      )
      const outcome = answerOutcome(raw)
      note(outcome)
      if (outcome === "ok" || last) return { raw, model: AI_MODELS[key].id, ttftMs, totalMs: performance.now() - start }
      console.warn(`[${label}] ${AI_MODELS[key].label} refused or returned empty, falling back to ${AI_MODELS[order[i + 1]].label}`)
    } catch (err) {
      note(failureOutcome(err, signal))
      if (signal?.aborted || last) throw err
      const e = err as { message?: string }
      console.warn(`[${label}] ${AI_MODELS[key].label} error, falling back to ${AI_MODELS[order[i + 1]].id}:`, e?.message ?? err)
    }
  }
  throw new Error("unreachable")
}
