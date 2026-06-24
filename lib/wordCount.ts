// lib/wordCount.ts
// Small word-counting helpers for word-limited inputs.

// Counts whitespace-delimited words. Empty/whitespace-only → 0.
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// Truncates to at most `max` words while preserving the original spacing between
// the kept words (so typing/editing isn't disrupted). Trailing whitespace and
// any words beyond the limit are dropped — this is what blocks a new word once
// the limit is reached.
export function truncateToWords(text: string, max: number): string {
  if (max <= 0) return ""
  const match = text.match(new RegExp(`^\\s*(?:\\S+\\s+){0,${max - 1}}\\S+`))
  return match ? match[0] : ""
}
