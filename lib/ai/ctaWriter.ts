// lib/ai/ctaWriter.ts — "Write with AI" in My CTA (lib/creatorCta.ts): three
// short call-to-action lines for a creator, written from their profile (what
// they post about, for whom, in their voice), e.g. "Follow <their name> for one
// LinkedIn growth idea every weekday". The creator picks one and edits it.
import Anthropic from "@anthropic-ai/sdk"
import { parseJsonObject } from "@/lib/ai/jsonAnswer"
import { CTA_LIMITS, cleanCtaText, ctaCardInputSchema } from "@/lib/creatorCta"

export const CTA_WRITER_MODEL = "claude-opus-5-5"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 })

export class CtaWriterError extends Error {}

export type CtaWriterProfile = {
  name: string
  headline?: string | null
  industry?: string | null
  targetAudience?: string | null
  contentPillars?: string[]
  writingStyle?: string | null
}

// Phrases that make a line sound machine-made.
const TELLS = [/—/, /\bunlock\b/i, /\belevate\b/i, /\bgame[- ]changer\b/i, /\bdelve\b/i, /\bjourney\b/i, /\bsupercharge\b/i]

const SYSTEM = `You write the one-line call to action a LinkedIn creator puts at the end of their carousels and images, next to their photo and name.

Write exactly 3 different lines, each a real option:
1. a follow line that says what they'll get by following, specific to what this creator posts about (shaped like "Follow <their name> for one practical idea about <their topic> every weekday")
2. a share or save line (e.g. "Repost this to help someone in your network", "Save this for your next launch")
3. a conversation line: a question or an invitation to comment that fits their topic

Rules: each under ${CTA_LIMITS.line} characters; plain, specific and human, in the creator's voice; at most one emoji in a line, and none is fine; no hashtags, no links, no em dashes, no hype words ("unlock", "elevate", "game-changer", "journey"). Use the creator's name only in the follow line, spelled exactly as given after "Creator:", and never any other person's name. If no name is given, write the follow line without a name ("Follow me for ...").

Answer with JSON only: {"lines": ["...", "...", "..."]}`

function profileText(p: CtaWriterProfile, about: string): string {
  return [
    `Creator: ${p.name || "(no name given)"}`,
    p.headline ? `Headline: ${p.headline}` : "",
    p.industry ? `Industry: ${p.industry}` : "",
    p.targetAudience ? `Writes for: ${p.targetAudience}` : "",
    p.contentPillars?.length ? `Posts about: ${p.contentPillars.slice(0, 6).join(", ")}` : "",
    p.writingStyle ? `Writing style: ${p.writingStyle}` : "",
    about ? `What they want the CTA to do: ${about}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

/** Each line cleaned and checked like a saved CTA line; null when it isn't usable. */
export function usableLine(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const line = cleanCtaText(raw).replace(/^["“]|["”]$/g, "")
  if (!line || TELLS.some((t) => t.test(line))) return null
  const checked = ctaCardInputSchema.shape.line.safeParse(line)
  return checked.success ? checked.data : null
}

/** Three CTA lines for this creator (fewer only when the AI's answer had unusable ones twice). */
export async function suggestCtaLines(profile: CtaWriterProfile, about = ""): Promise<string[]> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: profileText(profile, cleanCtaText(about).slice(0, 200)) }]
  let best: string[] = []
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.create({ model: CTA_WRITER_MODEL, max_tokens: 600, system: SYSTEM, messages })
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
    const lines = Array.isArray(parseJsonObject(raw)?.lines) ? (parseJsonObject(raw)!.lines as unknown[]) : []
    const usable = [...new Set(lines.map(usableLine).filter((l): l is string => !!l))].slice(0, 3)
    if (usable.length > best.length) best = usable
    if (best.length === 3) return best
    messages.push(
      { role: "assistant", content: raw || "(no answer)" },
      { role: "user", content: `Some lines broke the rules (too long, a link, an em dash or a hype word). Answer again with 3 lines that follow every rule, JSON only.` },
    )
  }
  if (best.length === 0) throw new CtaWriterError("The AI couldn't write usable lines this time. Try again.")
  return best
}
