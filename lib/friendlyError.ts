// lib/friendlyError.ts
// Maps raw/technical generation errors (especially JSON-parse failures from the
// AI) to a single friendly, retry-oriented message for UI display. Non-technical
// errors (rate limits, "No credits", etc.) are passed through unchanged.

export const GENERATION_RETRY_MESSAGE =
  "Something went wrong generating this. Please try again."

const TECHNICAL_PATTERNS = [
  "failed to parse",
  "could not be parsed as json",
  "parsing strategies",
  "unexpected response from ai",
  "unexpected ai response",
  "could not parse",
  "failed to generate content",
]

export function friendlyGenerationError(message: string | null | undefined): string {
  if (!message) return GENERATION_RETRY_MESSAGE
  const lower = message.toLowerCase()
  if (TECHNICAL_PATTERNS.some((p) => lower.includes(p))) {
    return GENERATION_RETRY_MESSAGE
  }
  return message
}
