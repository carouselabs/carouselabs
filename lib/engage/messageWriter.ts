// lib/engage/messageWriter.ts — writes a DM with the model and holds it to
// the same checks every time (lib/engage/messageRoute.ts for real replies,
// app/api/ext/agents/test for an agent's test): text the cleaner had to cut
// too much of, a figure that isn't in the sources, or a left-over template
// bracket is never kept; generic filler gets one more try (kept as a
// fallback). Moved out of messageRoute, unchanged for a single message.
//
// "alternatives" asks for several different replies in one call and keeps
// every one that passes; "explained" also returns why the reply fits.
import { ANTI_FABRICATION_REMINDER, WEAK_COMMENT_PATTERNS } from "@/lib/ai/prompts/commentPrompt"
import { MESSAGE_WEAK_PATTERNS, PLACEHOLDER_BRACKET_PATTERN, type MessageOutput } from "@/lib/ai/prompts/messagePrompt"
import { callCommentModelWithInfo, generationDeadline, GenerationTimeout, parseComment, sanitizeComment, PRIMARY_MODEL } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"
import { parseJsonObject } from "@/lib/ai/jsonAnswer"
import type { AiCaller } from "@/lib/engage/aiUsage"

export interface WrittenMessage {
  message: string
  // "alternatives": every reply that passed, the first being `message`.
  alternatives: string[]
  // "explained": why it fits ("" when the model gave none).
  why: string
  // The model that wrote it (recorded in History).
  model: string
}

interface WriteOptions {
  system: string
  user: string
  // Where figures may come from: the thread, the contact, the agent's facts.
  numberSources: string
  label: string
  engage: AiCaller
  output?: MessageOutput
}

type Verdict = { ok: true; text: string; weak: boolean } | { ok: false; unsourced: boolean }

function check(candidate: string, numberSources: string, label: string, attempt: number): Verdict {
  const { comment: cleaned, removedChars } = sanitizeComment(candidate)
  if (!cleaned || removedChars > candidate.length * 0.25) {
    console.warn(`[${label}] attempt ${attempt}: ${removedChars} chars stripped, dropped`)
    return { ok: false, unsourced: false }
  }
  // Never kept, even as a fallback: the message goes out under the user's
  // name, to someone they are trying to build a real relationship with.
  const unsourced = findUnsourcedNumbers(cleaned, numberSources)
  if (unsourced.length > 0) {
    console.warn(`[${label}] attempt ${attempt}: unsourced figures (${unsourced.join(", ")}), dropped`)
    return { ok: false, unsourced: true }
  }
  // A literal "[their industry]" left in the output is a template, not a
  // message, and must never be sent.
  if (PLACEHOLDER_BRACKET_PATTERN.test(cleaned)) {
    console.warn(`[${label}] attempt ${attempt}: unfilled placeholder bracket, dropped`)
    return { ok: false, unsourced: false }
  }
  const weak = [...MESSAGE_WEAK_PATTERNS, ...WEAK_COMMENT_PATTERNS].filter(({ pattern }) => pattern.test(cleaned))
  if (weak.length > 0) console.warn(`[${label}] attempt ${attempt}: weak patterns (${weak.map((w) => w.label).join(", ")})`)
  return { ok: true, text: cleaned, weak: weak.length > 0 }
}

function candidatesOf(raw: string, output: MessageOutput): string[] {
  if (output === "alternatives") {
    const replies = parseJsonObject(raw)?.replies
    if (Array.isArray(replies)) return replies.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
  }
  // A single reply (or a list the model didn't give: its one comment).
  const one = parseComment(raw)
  return one?.trim() ? [one] : []
}

export async function writeMessage({ system, user, numberSources, label, engage, output = "single" }: WriteOptions): Promise<WrittenMessage | null> {
  let fallback: WrittenMessage | null = null
  let remindAboutFabrication = false
  const deadline = generationDeadline()

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const userContent = remindAboutFabrication ? `${user}\n\n${ANTI_FABRICATION_REMINDER}` : user

    let raw: string
    let model: string = PRIMARY_MODEL
    try {
      const answer = await callCommentModelWithInfo(system, userContent, label, { deadline, engage })
      raw = answer.raw
      model = answer.model
    } catch (err) {
      if (err instanceof GenerationTimeout) {
        console.error(`[${label}] attempt ${attempt}: out of time, giving up`)
        break
      }
      console.error(`[${label}] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const candidates = candidatesOf(raw, output)
    if (candidates.length === 0) {
      console.warn(`[${label}] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const passed: string[] = []
    const weak: string[] = []
    for (const candidate of candidates) {
      const verdict = check(candidate, numberSources, label, attempt)
      if (!verdict.ok) {
        if (verdict.unsourced) remindAboutFabrication = true
        continue
      }
      const list = verdict.weak ? weak : passed
      if (!passed.includes(verdict.text) && !weak.includes(verdict.text)) list.push(verdict.text)
    }

    const why = output === "explained" ? String(parseJsonObject(raw)?.why ?? "").trim().slice(0, 400) : ""
    const result = (texts: string[]): WrittenMessage => ({ message: texts[0], alternatives: output === "alternatives" ? texts : [], why, model })

    // Clean ones are kept at once; generic ones only on the last try, or as
    // the fallback if that try fails outright.
    if (passed.length > 0 && (output !== "alternatives" || passed.length >= 2 || attempt === 2)) return result([...passed, ...weak])
    if (attempt === 2 && weak.length > 0) return result(weak)
    if (passed.length + weak.length > 0 && !fallback) fallback = result([...passed, ...weak])
  }

  return fallback
}
