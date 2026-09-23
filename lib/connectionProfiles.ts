// lib/connectionProfiles.ts — validation and plan limits for Connection Note
// profiles (app/api/ext/connection-profiles and .../[id]). Mirrors
// lib/commentProfiles.ts, which does the same job for comment profiles, so
// create and edit cannot drift on what counts as a valid profile.
//
// Kept separate rather than generalised: a connection note has no emoji or
// language field, its length ceiling is LinkedIn's invitation limit rather
// than a comment's, and the two are free to diverge further.
import type { Plan } from "@prisma/client"
import { CONNECTION_NOTE_HARD_MAX, CONNECTION_NOTE_MIN } from "@/lib/ai/prompts/connectionNotePrompt"

// How many CUSTOM connection profiles a plan may own. System profiles are
// shared and never count against this. null means unlimited. Same shape as
// CUSTOM_PROFILE_LIMITS for comments, counted separately: a user's one free
// comment profile should not cost them their connection profile.
export const CUSTOM_CONNECTION_PROFILE_LIMITS: Record<Plan, number | null> = {
  FREE: 1,
  PRO: 5,
  GROWTH: null,
}

export function customConnectionProfileLimit(plan: Plan): number | null {
  return CUSTOM_CONNECTION_PROFILE_LIMITS[plan]
}

const MAX_LENGTHS = {
  name: 80,
  angle: 400,
  goal: 200,
  tone: 60,
  length: 60,
  alwaysDo: 500,
  neverDo: 500,
  sample: 400,
} as const

export const MAX_CONNECTION_SAMPLES = 5

export interface ConnectionProfileInput {
  name: string
  angle: string
  goal: string
  tone: string
  length: string
  alwaysDo: string | null
  neverDo: string | null
  samples: string[]
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

// Returns the cleaned profile, or an error string naming the first problem.
// Name / Angle / Goal / Tone / Length are required; the rest are optional.
export function parseConnectionProfileInput(
  body: unknown,
): { ok: true; value: ConnectionProfileInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" }
  const raw = body as Record<string, unknown>

  const value: ConnectionProfileInput = {
    name: str(raw.name, MAX_LENGTHS.name),
    angle: str(raw.angle, MAX_LENGTHS.angle),
    goal: str(raw.goal, MAX_LENGTHS.goal),
    tone: str(raw.tone, MAX_LENGTHS.tone),
    length: str(raw.length, MAX_LENGTHS.length),
    alwaysDo: str(raw.alwaysDo, MAX_LENGTHS.alwaysDo) || null,
    neverDo: str(raw.neverDo, MAX_LENGTHS.neverDo) || null,
    samples: Array.isArray(raw.samples)
      ? raw.samples
          .map((s) => str(s, MAX_LENGTHS.sample))
          .filter(Boolean)
          .slice(0, MAX_CONNECTION_SAMPLES)
      : [],
  }

  const required: [keyof ConnectionProfileInput, string][] = [
    ["name", "Profile name"],
    ["angle", "How you come across"],
    ["goal", "Note goal"],
    ["tone", "Tone"],
    ["length", "Length"],
  ]

  for (const [field, label] of required) {
    if (!value[field]) return { ok: false, error: `${label} is required` }
  }

  // Ranges are written as "N-M characters" and bounded by LinkedIn's own
  // invitation limit, so nothing can be saved that the note route would then
  // have to trim.
  const range = value.length.match(/(\d+)\s*-\s*(\d+)\s*char/i)
  if (!range) {
    return { ok: false, error: `Length must be a character range, e.g. "120-220 characters"` }
  }

  const min = Number(range[1])
  const max = Number(range[2])
  if (min < CONNECTION_NOTE_MIN || max > CONNECTION_NOTE_HARD_MAX || min > max) {
    return {
      ok: false,
      error: `Length must be a range between ${CONNECTION_NOTE_MIN} and ${CONNECTION_NOTE_HARD_MAX} characters, minimum first`,
    }
  }

  return { ok: true, value }
}
