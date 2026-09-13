// lib/platforms.ts
// Shared platform metadata for Content Hub — one place to add a platform so
// the composer UI, the scheduling API routes, and the cron publisher all stay
// in sync. Plain data only (no JSX), so this is safe to import from server
// routes as well as client components.

export type Platform =
  | "linkedin"
  | "instagram"
  | "x"
  | "facebook"
  | "pinterest"
  | "tiktok"
  | "threads"
  | "youtube"

export const PLATFORM_ORDER: Platform[] = [
  "linkedin",
  "instagram",
  "x",
  "facebook",
  "pinterest",
  "tiktok",
  "threads",
  "youtube",
]

// `functional: true` means CarouseLabs can actually publish there today.
// Every other platform is still selectable in the composer (so intent is
// captured), but a schedule request for one of them is downgraded to
// "pending_connection" instead of "queued" — see app/api/content-hub/scheduled
// and the cron publisher, neither of which ever queries pending_connection
// rows. Flip `functional` to true here once a platform gets real API access;
// no other file needs to change.
export const PLATFORM_META: Record<Platform, { label: string; color: string; functional: boolean }> = {
  linkedin: { label: "LinkedIn", color: "#0A66C2", functional: true },
  instagram: { label: "Instagram", color: "#E1306C", functional: false },
  x: { label: "X", color: "#0A0A0A", functional: false },
  facebook: { label: "Facebook", color: "#1877F2", functional: false },
  pinterest: { label: "Pinterest", color: "#E60023", functional: false },
  tiktok: { label: "TikTok", color: "#0A0A0A", functional: false },
  threads: { label: "Threads", color: "#0A0A0A", functional: false },
  youtube: { label: "YouTube", color: "#FF0000", functional: false },
}

export const FUNCTIONAL_PLATFORMS: Platform[] = PLATFORM_ORDER.filter((p) => PLATFORM_META[p].functional)

export function isValidPlatform(val: unknown): val is Platform {
  return PLATFORM_ORDER.includes(val as Platform)
}

export function isFunctionalPlatform(platform: Platform): boolean {
  return PLATFORM_META[platform].functional
}
