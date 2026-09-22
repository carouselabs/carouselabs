// lib/commentProfiles.ts — validation and plan limits shared by the Comment
// extension's profile routes (app/api/ext/profiles, .../[id], .../test).
// Kept in one place so create, edit and test cannot drift on what counts as a
// valid profile.
import type { Plan } from "@prisma/client"

// How many CUSTOM profiles a plan may own. System profiles are shared and
// never count against this. null means unlimited.
export const CUSTOM_PROFILE_LIMITS: Record<Plan, number | null> = {
  FREE: 1,
  PRO: 5,
  GROWTH: null,
}

export function customProfileLimit(plan: Plan): number | null {
  return CUSTOM_PROFILE_LIMITS[plan]
}

// Free tests per profile. A brand-new draft has no row to count against, so
// the form tracks its own allowance client-side until first save; from then on
// this is enforced server-side against CommentProfile.testsUsed.
export const TEST_LIMIT = 3

const MAX_LENGTHS = {
  name: 80,
  whoIAm: 400,
  goal: 200,
  tone: 60,
  length: 60,
  emoji: 40,
  language: 40,
  alwaysDo: 500,
  neverDo: 500,
  sample: 1200,
} as const

export const MAX_SAMPLES = 5

// Bounds for an explicit "N-M characters" length. Span every range a stored
// profile can have — 15 is Quick Human's floor, 900 the top of the "Long"
// bucket — and must equal CHAR_MIN/CHAR_MAX in the extension's ProfileForm,
// so every savable range is one its slider can display exactly.
export const LENGTH_RANGE_MIN = 15
export const LENGTH_RANGE_MAX = 900

export interface ProfileInput {
  name: string
  whoIAm: string
  goal: string
  tone: string
  length: string
  emoji: string
  language: string
  alwaysDo: string | null
  neverDo: string | null
  samples: string[]
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

// Returns the cleaned profile, or an error string naming the first problem.
// Name / Who I am / Goal / Tone / Length are required; the rest are optional.
export function parseProfileInput(body: unknown): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" }
  const raw = body as Record<string, unknown>

  const value: ProfileInput = {
    name: str(raw.name, MAX_LENGTHS.name),
    whoIAm: str(raw.whoIAm, MAX_LENGTHS.whoIAm),
    goal: str(raw.goal, MAX_LENGTHS.goal),
    tone: str(raw.tone, MAX_LENGTHS.tone),
    length: str(raw.length, MAX_LENGTHS.length),
    emoji: str(raw.emoji, MAX_LENGTHS.emoji) || "None",
    language: str(raw.language, MAX_LENGTHS.language) || "English",
    alwaysDo: str(raw.alwaysDo, MAX_LENGTHS.alwaysDo) || null,
    neverDo: str(raw.neverDo, MAX_LENGTHS.neverDo) || null,
    samples: Array.isArray(raw.samples)
      ? raw.samples
          .map((s) => str(s, MAX_LENGTHS.sample))
          .filter(Boolean)
          .slice(0, MAX_SAMPLES)
      : [],
  }

  const required: [keyof ProfileInput, string][] = [
    ["name", "Profile name"],
    ["whoIAm", "Who I am"],
    ["goal", "Comment goal"],
    ["tone", "Tone"],
    ["length", "Length"],
  ]

  for (const [field, label] of required) {
    if (!value[field]) return { ok: false, error: `${label} is required` }
  }

  // The builder writes explicit ranges as "N-M characters". Enforced with the
  // picker's exact bounds, so nothing can be saved that the picker could not
  // display — a hand-crafted "5-10" would otherwise open showing 15.
  const range = value.length.match(/(\d+)\s*-\s*(\d+)\s*char/i)
  if (range) {
    const min = Number(range[1])
    const max = Number(range[2])
    if (min < LENGTH_RANGE_MIN || max > LENGTH_RANGE_MAX || min > max) {
      return {
        ok: false,
        error: `Length must be a range between ${LENGTH_RANGE_MIN} and ${LENGTH_RANGE_MAX} characters, minimum first`,
      }
    }
  }

  return { ok: true, value }
}
