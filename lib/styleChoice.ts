// lib/styleChoice.ts
// What someone picks after "Skip, generate without reference": one of the 48
// looks (lib/styleLooks.ts), "let AI decide", or a style they describe in their
// own words. The words go into the image prompt, so they're cleaned and checked
// here first: the screen shows the same problems the server would refuse
// (lib/styleDescriptionCheck.ts adds a content-safety check on the server).
// No server-only imports: the browser uses this too.
import { lookById } from "@/lib/styleLooks"

export type StyleChoice = { kind: "ai" } | { kind: "look"; lookId: string } | { kind: "describe"; text: string }

export const STYLE_DESCRIPTION_MIN_CHARS = 12
export const STYLE_DESCRIPTION_MAX_CHARS = 400

// Invisible characters, and control characters (line breaks become spaces, so
// the description stays one paragraph inside the prompt).
const INVISIBLE = /[​-‍⁠﻿]/g
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g
// Markup, code and JSON characters: they can't describe a look, and removing
// them means the description can never close the block it's placed in.
const MARKUP = /[<>{}[\]`\\|]/g

/** The description as it's sent: one tidy paragraph, nothing that could act as markup. */
export function cleanStyleDescription(raw: string): string {
  return raw.normalize("NFKC").replace(INVISIBLE, "").replace(CONTROL, " ").replace(MARKUP, " ").replace(/\s+/g, " ").trim()
}

export const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|ai|co|app|dev|me|ly|in|uk)\b(?:\/\S*)?/i
// Only clear attempts to talk to the AI instead of describing a look. The
// prompt itself treats the description as data, so this needn't catch everything.
export const INSTRUCTIONS = [
  /\b(ignore|disregard|forget|override)\b[^.]{0,30}\b(previous|above|prior|earlier|all|system|your)\b[^.]{0,20}\b(instructions?|prompts?|rules?|messages?)\b/i,
  /\bsystem prompt\b|\bjailbreak\b|\bdeveloper mode\b|\bprompt injection\b/i,
  /\b(reveal|print|repeat|show|output)\b[^.]{0,30}\b(system|hidden|your)\s+(prompt|instructions)\b/i,
  /\byou are now\b|\bact as (an?|the) (ai|assistant|chatbot|model|system)\b/i,
]

export const STYLE_DESCRIPTION_EXAMPLES = [
  "Dark navy background, bold white headline, neon green accents, sleek and techy",
  "Soft pastel colors, rounded friendly font, hand-drawn doodles, warm and playful",
  "Black and white, elegant serif headline, lots of empty space, minimal and premium",
] as const

/** Why the description can't be used yet, or null when it's fine. */
export function styleDescriptionProblem(text: string): string | null {
  if (text.length < STYLE_DESCRIPTION_MIN_CHARS) {
    return "Describe the look in a few more words: colors, fonts, mood or illustration style."
  }
  if (text.length > STYLE_DESCRIPTION_MAX_CHARS) {
    return `Keep it under ${STYLE_DESCRIPTION_MAX_CHARS} characters. Stick to colors, fonts, mood and illustration style.`
  }
  if (!/\p{L}{2,}/u.test(text)) return "Use words to describe the look."
  if (LINK.test(text)) return "Links can't be opened here. Describe the look in words instead."
  if (INSTRUCTIONS.some((re) => re.test(text))) {
    return "Describe only how the image should look (colors, fonts, mood, illustration style). Instructions to the AI can't be used here."
  }
  return null
}

/** A saved choice read back (from localStorage), or null when it isn't one. */
export function parseStyleChoice(stored: unknown): StyleChoice | null {
  if (!stored || typeof stored !== "object") return null
  const value = stored as { kind?: unknown; lookId?: unknown; text?: unknown }
  if (value.kind === "ai") return { kind: "ai" }
  if (value.kind === "look" && typeof value.lookId === "string" && lookById(value.lookId)) return { kind: "look", lookId: value.lookId }
  if (value.kind === "describe" && typeof value.text === "string") {
    const text = cleanStyleDescription(value.text)
    return styleDescriptionProblem(text) ? null : { kind: "describe", text }
  }
  return null
}

/** A short line naming the choice, for the steps after it. */
export function styleChoiceLabel(choice: StyleChoice | null): string | null {
  if (!choice) return null
  if (choice.kind === "ai") return "Style: AI decides"
  if (choice.kind === "look") return `Look: ${lookById(choice.lookId)?.name ?? "Custom"}`
  return "Style: your own description"
}

/** The description to send with a generation, if the choice is one. */
export const styleDescriptionOf = (choice: StyleChoice | null): string | undefined =>
  choice?.kind === "describe" ? choice.text : undefined
