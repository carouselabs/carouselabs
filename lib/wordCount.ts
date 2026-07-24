// lib/wordCount.ts
// Small word-counting helpers for word-limited inputs.

// Counts whitespace-delimited words. Empty/whitespace-only → 0.
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// Truncates to at most `max` words while preserving the original spacing between
// the kept words (so typing/editing isn't disrupted). Words beyond the limit are
// dropped — this is what blocks a new word once the limit is reached.
export function truncateToWords(text: string, max: number): string {
  if (max <= 0) return ""
  // At/under the limit: return the text untouched. Anchoring a truncation
  // regex on a trailing \S+ (as this used to do unconditionally) can never
  // match a string ending in a space, so it strips the space the user just
  // typed on every keystroke — this early return is what avoids that.
  const words = text.match(/\S+/g) ?? []
  if (words.length <= max) return text
  // Over the limit: keep only the first `max` words.
  const match = text.match(new RegExp(`^\\s*(?:\\S+\\s+){0,${max - 1}}\\S+`))
  return match ? match[0] : ""
}
