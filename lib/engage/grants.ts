// lib/engage/grants.ts — how long an admin grant lasts. Pure, unit-tested.
import { z } from "zod"

export const GRANT_DURATIONS = ["1d", "7d", "14d", "30d", "3m", "6m", "1y", "lifetime", "custom"] as const
export type GrantDuration = (typeof GRANT_DURATIONS)[number]

export const GRANT_DURATION_LABELS: Record<GrantDuration, string> = {
  "1d": "1 day",
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
  lifetime: "Lifetime",
  custom: "Custom date",
}

// Which extension free access unlocks: LinkedIn and X are sold separately.
// Grants from before that are "both".
export const GRANT_PLATFORMS = ["both", "linkedin", "x"] as const
export type GrantPlatform = (typeof GRANT_PLATFORMS)[number]
export const GRANT_PLATFORM_LABELS: Record<GrantPlatform, string> = {
  both: "LinkedIn + X",
  linkedin: "LinkedIn",
  x: "X",
}
export const grantPlatformSchema = z.enum(GRANT_PLATFORMS).default("both")

export const grantLengthSchema = z
  .object({
    duration: z.enum(GRANT_DURATIONS),
    // Required for "custom": the moment access ends.
    endsAt: z.iso.datetime().optional(),
  })
  .refine((v) => v.duration !== "custom" || !!v.endsAt, { message: "Pick an end date", path: ["endsAt"] })

// When a grant starting `from` ends; null = lifetime. Months and years are
// calendar months/years (Jan 31 + 1 month = Mar 3 in JS is avoided by
// clamping to the month's last day).
export function grantEndsAt(duration: GrantDuration, from: Date, customEndsAt?: string): Date | null {
  const days = (n: number) => new Date(from.getTime() + n * 86_400_000)
  const months = (n: number) => {
    const d = new Date(from)
    const day = d.getUTCDate()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() + n)
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
    d.setUTCDate(Math.min(day, lastDay))
    return d
  }
  switch (duration) {
    case "1d":
      return days(1)
    case "7d":
      return days(7)
    case "14d":
      return days(14)
    case "30d":
      return days(30)
    case "3m":
      return months(3)
    case "6m":
      return months(6)
    case "1y":
      return months(12)
    case "lifetime":
      return null
    case "custom": {
      const end = customEndsAt ? new Date(customEndsAt) : null
      if (!end || Number.isNaN(end.getTime())) throw new Error("A custom grant needs an end date")
      return end
    }
  }
}

export type GrantState = "active" | "scheduled" | "expired" | "revoked"

export function grantState(
  grant: { startsAt: Date; endsAt: Date | null; revokedAt: Date | null },
  now: Date,
): GrantState {
  if (grant.revokedAt) return "revoked"
  if (grant.startsAt.getTime() > now.getTime()) return "scheduled"
  if (grant.endsAt && grant.endsAt.getTime() <= now.getTime()) return "expired"
  return "active"
}
