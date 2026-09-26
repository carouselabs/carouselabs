// lib/messageProfiles.ts — validation and plan limits for Conversation
// Assistant profiles (app/api/ext/message-profiles and .../[id]). Mirrors
// lib/connectionProfiles.ts, which does the same job for connection notes.
import type { Plan } from "@prisma/client"

// Counted separately from comment and connection profiles — a user's one
// free comment profile shouldn't cost them their one free message profile.
export const CUSTOM_MESSAGE_PROFILE_LIMITS: Record<Plan, number | null> = {
  FREE: 1,
  PRO: 5,
  GROWTH: null,
}

export function customMessageProfileLimit(plan: Plan): number | null {
  return CUSTOM_MESSAGE_PROFILE_LIMITS[plan]
}

const MAX_LENGTHS = {
  name: 80,
  goal: 400,
  tone: 60,
  alwaysDo: 500,
  neverDo: 500,
  sample: 1200,
} as const

export const MAX_MESSAGE_SAMPLES = 5

export interface MessageProfileInput {
  name: string
  goal: string
  tone: string
  alwaysDo: string | null
  neverDo: string | null
  samples: string[]
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

// Returns the cleaned profile, or an error string naming the first problem.
// Name / Goal / Tone are required; the rest are optional. No length field,
// unlike comment/connection profiles — see the model's own comment.
export function parseMessageProfileInput(
  body: unknown,
): { ok: true; value: MessageProfileInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" }
  const raw = body as Record<string, unknown>

  const value: MessageProfileInput = {
    name: str(raw.name, MAX_LENGTHS.name),
    goal: str(raw.goal, MAX_LENGTHS.goal),
    tone: str(raw.tone, MAX_LENGTHS.tone),
    alwaysDo: str(raw.alwaysDo, MAX_LENGTHS.alwaysDo) || null,
    neverDo: str(raw.neverDo, MAX_LENGTHS.neverDo) || null,
    samples: Array.isArray(raw.samples)
      ? raw.samples
          .map((s) => str(s, MAX_LENGTHS.sample))
          .filter(Boolean)
          .slice(0, MAX_MESSAGE_SAMPLES)
      : [],
  }

  const required: [keyof MessageProfileInput, string][] = [
    ["name", "Profile name"],
    ["goal", "Purpose"],
    ["tone", "Tone"],
  ]

  for (const [field, label] of required) {
    if (!value[field]) return { ok: false, error: `${label} is required` }
  }

  return { ok: true, value }
}
