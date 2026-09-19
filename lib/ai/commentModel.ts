// lib/ai/commentModel.ts — model call, response parsing and output validation
// shared by the Comment extension's two generation routes
// (app/api/ext/generate and app/api/ext/rewrite). Extracted so the lenient
// parse ladder and the sanitiser exist once: a rewrite that stripped hashtags
// differently from a fresh generate would be a quiet inconsistency.
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { BANNED_PHRASES } from "@/lib/ai/prompts/commentPrompt"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Haiku rather than the Sonnet used by the carousel/image routes: a comment is
// a few dozen words and the user is watching a side panel spinner, so latency
// matters more here than headroom.
export const CLAUDE_MODEL = "claude-haiku-4-5-20251001"
export const FALLBACK_MODEL = "gpt-4o"

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

// Removes what the prompt already forbids, for the cases where the model
// ignores it. Reports how much was removed so the caller can tell a cosmetic
// tidy-up from a comment that was mostly banned filler.
export function sanitizeComment(raw: string): { comment: string; removedChars: number } {
  const before = raw.trim()
  let comment = before

  // Hashtags, including the trailing runs models like to append.
  comment = comment.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1")

  for (const phrase of BANNED_PHRASES) {
    // Phrase plus any punctuation and spacing that trails it, so removing
    // "Great post" doesn't leave a stranded "! ".
    comment = comment.replace(new RegExp(`${phrase}[\\s!.,—-]*`, "gi"), "")
  }

  comment = comment
    .replace(/—/g, "-")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return { comment, removedChars: before.length - comment.length }
}

// Numbers in the output that appear in neither the post nor the commenter's own
// instruction were invented by the model. That matters more here than in most
// generation flows: the comment is posted under the user's name, so a made-up
// "40% time savings" becomes a claim they appear to be making themselves.
//
// Compared as exact normalised tokens rather than substrings: a loose match
// would let a fabricated "4x" pass because the post happened to mention "40".
export function findUnsourcedNumbers(comment: string, sources: string): string[] {
  const normalize = (n: string) => n.replace(/,/g, "").replace(/[.]+$/, "")
  const sourceNumbers = new Set((sources.match(/\d[\d,.]*/g) ?? []).map(normalize))

  const unsourced = new Set<string>()
  for (const raw of comment.match(/\d[\d,.]*/g) ?? []) {
    const token = normalize(raw)
    if (token && !sourceNumbers.has(token)) unsourced.add(token)
  }

  return [...unsourced]
}

// Claude primary, GPT-4o on refusal or error. `label` only tags the log lines
// so the two routes stay distinguishable in output.
export async function callCommentModel(
  systemMessage: string,
  userMessage: string,
  label: string,
): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
    })

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")

    if (!isRefusal(raw) && raw.trim()) return raw
    console.warn(`[${label}] Claude refused or returned empty, falling back to GPT-4o`)
  } catch (err) {
    const e = err as { message?: string }
    console.warn(`[${label}] Claude error, falling back to GPT-4o:`, e?.message ?? err)
  }

  const response = await openai.chat.completions.create({
    model: FALLBACK_MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
  })

  return response.choices[0]?.message?.content ?? ""
}
