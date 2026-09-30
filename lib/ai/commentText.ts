// lib/ai/commentText.ts — text handling for the Comment extension's generated
// output, with no model clients and no path aliases, so it can be tested
// directly and used while a response is still streaming in.
//
// sanitizeComment is re-exported from lib/ai/commentModel.ts, where the routes
// import it from.
import { BANNED_PHRASES } from "./prompts/commentPrompt"

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

const COMMENT_KEY = /"comment"\s*:\s*"/

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" }

// The comment so far, read out of a model response that is still arriving as
// {"comment": "..."}. null until the key itself has arrived. Stops short of an
// escape sequence that is split across chunks, so nothing half-decoded ever
// reaches the screen. Display only: the finished response still goes through
// parseComment, which is what the route keeps.
export function extractPartialComment(raw: string): { text: string; complete: boolean } | null {
  const key = COMMENT_KEY.exec(raw)
  if (!key) return null

  let text = ""
  let i = key.index + key[0].length
  while (i < raw.length) {
    const ch = raw[i]
    if (ch === '"') return { text, complete: true }
    if (ch !== "\\") {
      text += ch
      i += 1
      continue
    }
    const next = raw[i + 1]
    if (next === undefined) break
    if (next === "u") {
      const hex = raw.slice(i + 2, i + 6)
      if (hex.length < 4) break
      if (/^[0-9a-f]{4}$/i.test(hex)) text += String.fromCharCode(parseInt(hex, 16))
      i += 6
      continue
    }
    text += ESCAPES[next] ?? next
    i += 2
  }

  // The low half of a surrogate pair hasn't arrived yet.
  if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1)
  return { text, complete: false }
}

// Length of the longest tail of `text` that could still grow into a banned
// phrase ("Great " before "post" arrives). Held back rather than shown, so a
// phrase the final comment will have stripped never flashes on screen.
function bannedPhraseTail(text: string): number {
  const lower = text.toLowerCase()
  let hold = 0
  for (const phrase of BANNED_PHRASES) {
    const p = phrase.toLowerCase()
    for (let k = Math.min(p.length - 1, lower.length); k > hold; k -= 1) {
      const start = lower.length - k
      const atWordStart = start === 0 || !/[\p{L}\p{N}]/u.test(lower[start - 1])
      if (atWordStart && lower.endsWith(p.slice(0, k))) {
        hold = k
        break
      }
    }
  }
  return hold
}

// What of a still-arriving comment may be shown now: whole words only (the
// last one may still be growing, and a number is only judged once it's
// complete), minus a tail that could still become a banned phrase, cleaned
// exactly as the finished comment will be. Once `complete`, it is simply the
// sanitized comment.
export function visibleCommentText(partial: string, complete: boolean): string {
  let text = partial
  if (!complete) {
    const lastBreak = Math.max(text.lastIndexOf(" "), text.lastIndexOf("\n"), text.lastIndexOf("\t"))
    text = lastBreak === -1 ? "" : text.slice(0, lastBreak + 1)
    text = text.slice(0, text.length - bannedPhraseTail(text))
  }
  return sanitizeComment(text).comment
}
