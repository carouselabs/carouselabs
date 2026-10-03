// lib/xProfiles.ts — rules specific to CarouseLabs Engage for X's profiles and
// settings. Profile fields are validated by lib/commentProfiles.ts, shared
// with LinkedIn; X adds its own length ceiling.
import { X_MAX_LENGTH, X_PREMIUM_REPLY_LENGTH } from "@/lib/xText"

export { X_PREMIUM_REPLY_LENGTH }
export const X_MAX_PROFILE_LENGTH = X_PREMIUM_REPLY_LENGTH

// A profile's "N-M characters" range must end within what X allows.
export function xLengthProblem(length: string): string | null {
  const range = length.match(/(\d+)\s*-\s*(\d+)\s*char/i)
  if (!range) return null
  return Number(range[2]) > X_MAX_PROFILE_LENGTH
    ? `X replies can be at most ${X_MAX_PROFILE_LENGTH} characters, so the range must end there or below`
    : null
}

// The account's reply limit: 280, or more for X Premium (settings).
export function clampReplyLength(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : X_MAX_LENGTH
  return Math.min(X_PREMIUM_REPLY_LENGTH, Math.max(X_MAX_LENGTH, n))
}
