// lib/engage/commentEngine.ts — the generation engine shared by the
// extensions' streamed routes: LinkedIn's Generate (app/api/ext/generate)
// and X's Reply (app/api/ext/x/reply). Up to two attempts, each shown as it
// is written, held to the same guardrails (no invented figures, no banned
// filler, no generic-AI tells, inside the length range), within the request's
// time budget; and the server-sent-events response the panel reads.
//
// Moved here unchanged from app/api/ext/generate/route.ts, plus the log label
// and the length measure, which differ for X.
import { generationDeadline, GenerationTimeout, parseComment, sanitizeComment, streamCommentModel } from "@/lib/ai/commentModel"
import type { AiCaller } from "@/lib/engage/aiUsage"
import { extractPartialComment, visibleCommentText } from "@/lib/ai/commentText"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"
import { ANTI_FABRICATION_REMINDER, WEAK_COMMENT_PATTERNS } from "@/lib/ai/prompts/commentPrompt"

// How often a quiet stream says it is still alive (see streamGeneration).
const KEEP_ALIVE_MS = 8_000

// Milliseconds spent in each stage of one request, for the Server-Timing
// header, the stream's final event and one log line. Durations only: no
// content, no identifiers.
export function stageTimer() {
  const start = performance.now()
  let last = start
  const stages: Record<string, number> = {}
  return {
    stages,
    mark(name: string) {
      const now = performance.now()
      stages[name] = Math.round(now - last)
      last = now
    },
    elapsed: () => Math.round(performance.now() - start),
  }
}

export interface GenerationInput {
  systemMessage: string
  userMessage: string
  min: number
  max: number
  // Everything the model is allowed to source a number from.
  numberSources: string
  // Tags the log lines ("ext/generate", "ext/x/reply").
  label?: string
  // How long the text is for min/max: plain characters on LinkedIn, X's own
  // weighted count on X (lib/xText.ts).
  measure?: (text: string) => number
  // Who asked and for what: picks the feature's AI model and records each
  // call (lib/ai/commentModel.ts).
  engage?: AiCaller
}

export interface GenerationHooks {
  // The current attempt's comment so far, each time more of it can be shown.
  // "" means clear what was shown.
  onText?: (text: string) => void
  // The attempt that was just shown has been discarded and another begins.
  onRetry?: (attempt: number) => void
}

export interface GenerationResult {
  comment: string
  // The model that wrote `comment` ("" when every attempt failed).
  model: string
  attempts: number
  // From the start of generation: first token of the first attempt, and the
  // first moment any comment text could be shown.
  ttftMs: number | null
  firstTextMs: number | null
}

export async function generateComment(input: GenerationInput, hooks: GenerationHooks = {}): Promise<GenerationResult> {
  const label = input.label ?? "ext/generate"
  const measure = input.measure ?? ((text: string) => text.length)
  const start = performance.now()
  let ttftMs: number | null = null
  let firstTextMs: number | null = null

  let comment = ""
  let commentModel = ""
  // A generation that is clean but off-length is held here rather than
  // discarded: if the retry then errors outright, returning a slightly long
  // comment beats failing the request entirely. Fabricated output is never
  // stored here: returning it would defeat the guardrail below.
  let offLengthFallback: { text: string; model: string } | null = null
  // Set when the previous attempt invented a figure, so the retry carries the
  // blunter reminder rather than the same message that already failed.
  let remindAboutFabrication = false
  let attempts = 0

  // Two attempts: the first failure (unparseable, empty, mostly-banned filler,
  // invented figures, or wildly off the profile's length) is retried once
  // before giving up. Both share one time budget.
  const deadline = generationDeadline()
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt
    if (attempt > 1) hooks.onRetry?.(attempt)

    const message = remindAboutFabrication
      ? `${input.userMessage}\n\n${ANTI_FABRICATION_REMINDER}`
      : input.userMessage

    // Mid-stream guard: the text shown so far is checked for invented figures
    // BEFORE it is shown, so a made-up statistic never reaches the screen.
    // Only whole words are ever checked (see visibleCommentText), so "8" is
    // never judged while "80%" is still arriving. Finding one stops the model
    // there — this attempt would be discarded anyway — rather than paying for
    // the rest of it.
    const controller = new AbortController()
    let invented: string[] = []
    let shown = ""
    const show = (text: string) => {
      if (text === shown) return
      shown = text
      if (text) firstTextMs ??= performance.now() - start
      hooks.onText?.(text)
    }

    let raw: string
    let model: string
    try {
      const result = await streamCommentModel(input.systemMessage, message, label, {
        signal: controller.signal,
        deadline,
        engage: input.engage,
        onReset: () => show(""),
        onRaw: (sofar) => {
          const partial = extractPartialComment(sofar)
          if (!partial) return
          const visible = visibleCommentText(partial.text, partial.complete)
          const unsourced = findUnsourcedNumbers(visible, input.numberSources)
          if (unsourced.length > 0) {
            invented = unsourced
            controller.abort()
            return
          }
          show(visible)
        },
      })
      raw = result.raw
      model = result.model
      if (attempt === 1 && result.ttftMs !== null) ttftMs = result.ttftMs
    } catch (err) {
      if (err instanceof GenerationTimeout) {
        console.error(`[${label}] attempt ${attempt}: out of time, giving up`)
        break
      }
      if (invented.length > 0) {
        console.warn(
          `[${label}] attempt ${attempt}: unsourced figures (${invented.join(", ")}) not in post or instruction, stopped mid-stream`,
        )
        remindAboutFabrication = true
        continue
      }
      console.error(`[${label}] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const parsed = parseComment(raw)
    if (!parsed?.trim()) {
      console.warn(`[${label}] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const { comment: cleaned, removedChars } = sanitizeComment(parsed)

    // Sanitising away a large slice means the model leaned on banned filler
    // rather than saying anything, so it's worth one more roll.
    if (removedChars > parsed.length * 0.25) {
      console.warn(`[${label}] attempt ${attempt}: ${removedChars} chars stripped, retrying`)
      continue
    }

    // Invented figures are checked before anything else that could let the
    // text through: a comment carrying a made-up statistic is never returned,
    // and never kept as a fallback, even on the final attempt. Failing the
    // request is the safer outcome, since the user posts this under their name.
    const unsourced = findUnsourcedNumbers(cleaned, input.numberSources)
    if (unsourced.length > 0) {
      console.warn(
        `[${label}] attempt ${attempt}: unsourced figures (${unsourced.join(", ")}) not in post or instruction, discarding`,
      )
      remindAboutFabrication = true
      continue
    }

    // Generic-AI tells are retried rather than stripped: they are positional
    // or mid-sentence, so deleting them would leave broken text. A second roll
    // usually lands somewhere more specific.
    const weak = WEAK_COMMENT_PATTERNS.filter(({ pattern }) => pattern.test(cleaned))
    if (weak.length > 0 && attempt === 1) {
      console.warn(
        `[${label}] attempt ${attempt}: weak patterns (${weak
          .map((w) => w.label)
          .join(", ")}), retrying`,
      )
      offLengthFallback ??= { text: cleaned, model }
      continue
    }

    const length = measure(cleaned)
    if (length < input.min || length > input.max) {
      console.warn(`[${label}] attempt ${attempt}: length ${length} outside ${input.min}-${input.max}, retrying`)
      offLengthFallback ??= { text: cleaned, model }
      continue
    }

    comment = cleaned
    commentModel = model
    break
  }

  if (!comment && offLengthFallback) {
    comment = offLengthFallback.text
    commentModel = offLengthFallback.model
  }

  return { comment, model: commentModel, attempts, ttftMs, firstTextMs }
}

export const GENERIC_FAILURE = "Something went wrong, try again"

export function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export interface StreamOptions {
  input: GenerationInput
  // Server time spent before the model was called, for the start event.
  beforeModelMs: number
  // Right after generation, before history (for the route's timer).
  onGenerated?: () => void
  // No usable text: give back the free use, log.
  onEmpty: (result: GenerationResult) => Promise<void>
  // Text: save it, log, and return the final event's payload.
  onDone: (result: GenerationResult) => Promise<Record<string, unknown>>
}

// The streamed response: start, the text as it is written (retries clear it),
// a keep-alive while the model is quiet, and a final or error event.
export function streamGeneration(options: StreamOptions): Response {
  const encoder = new TextEncoder()
  // Set once the client has gone (closed the panel mid-generation). Generation
  // still finishes and is saved, exactly as a JSON request whose caller left
  // would be; there's just nobody to send it to.
  let gone = false

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (gone) return
        try {
          controller.enqueue(encoder.encode(sse(event, data)))
        } catch {
          gone = true
        }
      }

      // Sent before the model is called, so the panel can tell "the server
      // has it" from "the model is thinking", and so any proxy in between
      // starts forwarding the stream straight away.
      send("start", { beforeModel: options.beforeModelMs })

      // While the model is quiet (thinking, or failing over to Haiku), a
      // comment line every few seconds tells the panel the server is still
      // working. The panel gives up on a stream that sends nothing at all for
      // 25s (src/lib/api.ts), which then means the connection is dead.
      const keepAlive = setInterval(() => {
        if (gone) return
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"))
        } catch {
          gone = true
        }
      }, KEEP_ALIVE_MS)

      try {
        const result = await generateComment(options.input, {
          onText: (text) => send("text", { text }),
          onRetry: (attempt) => send("retry", { attempt }),
        })
        options.onGenerated?.()

        if (!result.comment) {
          await options.onEmpty(result)
          send("error", { error: GENERIC_FAILURE, status: 502 })
          return
        }

        // Authoritative: the panel replaces whatever it streamed with this.
        // It is usually identical; it differs when the guardrails fell back
        // to an earlier attempt's text.
        send("final", await options.onDone(result))
      } catch (err) {
        console.error(`[${options.input.label ?? "ext/generate"}] stream failed:`, err)
        send("error", { error: GENERIC_FAILURE, status: 500 })
      } finally {
        clearInterval(keepAlive)
        gone = true
        try {
          controller.close()
        } catch {
          // already closed by the client going away
        }
      }
    },
    cancel() {
      gone = true
    },
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform: nothing between here and the panel may buffer or
      // compress the stream into one late chunk.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
