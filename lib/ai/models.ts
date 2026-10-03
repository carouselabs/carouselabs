// lib/ai/models.ts — the AI models CarouseLabs Engage writes with, and their
// default prices. No SDK imports, so the admin pages can use it too.
// lib/ai/commentModel.ts makes the calls: a feature's chosen model first
// (admin → Engage → AI; GPT Luna unless changed), the other as backup.
export const PRIMARY_MODEL = "gpt-6-luna"
export const FALLBACK_MODEL = "claude-haiku-4-5-20251001"

export const AI_MODEL_KEYS = ["luna", "haiku"] as const
export type AiModelKey = (typeof AI_MODEL_KEYS)[number]

export const AI_MODELS: Record<AiModelKey, { id: string; label: string }> = {
  luna: { id: PRIMARY_MODEL, label: "GPT Luna" },
  haiku: { id: FALLBACK_MODEL, label: "Claude Haiku 4.5" },
}

export function modelLabel(id: string): string {
  return AI_MODEL_KEYS.map((k) => AI_MODELS[k]).find((m) => m.id === id)?.label ?? id
}

// Dollars per million tokens. Claude Haiku 4.5's is Anthropic's list price
// ($1 in, $5 out); GPT Luna's isn't known here, so it starts unset and the
// admin enters it (its usage shows with no cost until then).
// A type alias, not an interface, so it can be stored as JSON as-is.
export type ModelPrice = {
  input: number
  output: number
}
export const DEFAULT_AI_PRICES: Record<string, ModelPrice> = {
  [FALLBACK_MODEL]: { input: 1, output: 5 },
}

// What a call cost, or null when the model's price isn't set or the tokens
// aren't known.
export function callCost(
  price: ModelPrice | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null {
  if (!price || inputTokens == null || outputTokens == null) return null
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000
}
