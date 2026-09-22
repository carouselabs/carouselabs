// lib/ai/numberGuard.ts — the Comment extension's invented-number check.
// Deliberately dependency-free (no model clients, no path aliases) so it can be
// exercised directly, and shared by app/api/ext/generate and
// app/api/ext/rewrite so both apply the same rule.
//
// Numbers in the output that appear in neither the post nor the commenter's own
// instruction were invented by the model. That matters more here than in most
// generation flows: the comment is posted under the user's name, so a made-up
// "40% time savings" becomes a claim they appear to be making themselves.

const NUMBER = /\d[\d,.]*/g

// Compared as exact normalised tokens rather than substrings: a loose match
// would let a fabricated "4x" pass because the post happened to mention "40".
const normalize = (n: string) => n.replace(/,/g, "").replace(/[.]+$/, "")

// Keyed by rounded value so 0.1 + 0.2 still equals 0.3.
const key = (n: number) => n.toFixed(6)

// Caps how many source numbers take part in the arithmetic check. Every pair
// yields three candidates, so an uncapped number-dense post would make almost
// any small integer "derivable" and quietly switch the guard off. Twenty
// numbers is 570 candidates — far more than any real LinkedIn post needs.
const MAX_DERIVATION_SOURCES = 20

// Values a model can legitimately state that are not in the text: the sum,
// difference or product of two numbers that are. Without this the guard
// rejected correct arithmetic, e.g. a post saying "14 steps down to 5" and a
// comment saying "cutting 9 steps" — roughly a quarter of live test runs
// failed on exactly this. Pairs are taken by position, so a number the post
// states twice can be combined with itself, but one it states once cannot.
function derivableValues(values: number[]): Set<string> {
  const derived = new Set<string>()
  const pool = values.slice(0, MAX_DERIVATION_SOURCES)

  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      const a = pool[i]
      const b = pool[j]
      derived.add(key(a + b))
      derived.add(key(Math.abs(a - b)))
      derived.add(key(a * b))
    }
  }

  return derived
}

export function findUnsourcedNumbers(comment: string, sources: string): string[] {
  const sourceTokens = (sources.match(NUMBER) ?? []).map(normalize).filter(Boolean)
  const literal = new Set(sourceTokens)

  const sourceValues = sourceTokens.map(Number).filter((n) => Number.isFinite(n))
  // Built lazily: most comments quote the post's numbers exactly, so the
  // pairwise work is only needed when a literal match fails.
  let derived: Set<string> | null = null

  const unsourced = new Set<string>()
  for (const raw of comment.match(NUMBER) ?? []) {
    const token = normalize(raw)
    if (!token || literal.has(token)) continue

    const value = Number(token)
    if (Number.isFinite(value)) {
      derived ??= derivableValues(sourceValues)
      if (derived.has(key(value))) continue
    }

    unsourced.add(token)
  }

  return [...unsourced]
}
