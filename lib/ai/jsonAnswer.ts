// lib/ai/jsonAnswer.ts — the first JSON object in a model's answer, bare or
// in a code fence, or null. For answers richer than {"comment": ...}, which
// parseComment (lib/ai/commentModel.ts) reads.
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const candidates = [raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1], raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)]
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      // Try the next form.
    }
  }
  return null
}
