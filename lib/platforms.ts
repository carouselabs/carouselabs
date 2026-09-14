// lib/platforms.ts
// Shared platform metadata for Content Hub — one place to add a platform so
// the composer UI, the scheduling API routes, and the cron publisher all stay
// in sync. Plain data only (no JSX), so this is safe to import from server
// routes as well as client components.
//
// TikTok and YouTube were removed from this list (see the PR that added
// this comment) — both are video-first platforms that don't fit CarouseLabs'
// image/carousel content model. Zero database rows referenced either value
// at removal time (ScheduledPost/RecurringSlot/QueueSlot.platform are plain
// String columns, not a DB enum, so this was a pure application-level change
// with no migration).

export type Platform = "linkedin" | "instagram" | "x" | "facebook" | "pinterest" | "threads"

export const PLATFORM_ORDER: Platform[] = ["linkedin", "instagram", "x", "facebook", "pinterest", "threads"]

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
  threads: { label: "Threads", color: "#0A0A0A", functional: false },
}

export const FUNCTIONAL_PLATFORMS: Platform[] = PLATFORM_ORDER.filter((p) => PLATFORM_META[p].functional)

export function isValidPlatform(val: unknown): val is Platform {
  return PLATFORM_ORDER.includes(val as Platform)
}

export function isFunctionalPlatform(platform: Platform): boolean {
  return PLATFORM_META[platform].functional
}

// ── Per-platform posting limits ──────────────────────────────────────
// Real 2026 platform limits — the single source of truth for character and
// image-count constraints. lib/captionPlatforms.ts (the AI caption flow's
// platform list) reads its charLimit from here too, rather than keeping a
// second, driftable copy (it previously listed Facebook at 5000 instead of
// the real 63,206 — this is the reconciled, accurate number).
//
// `functional` here is intentionally the SAME value as PLATFORM_META's, not
// a second hand-maintained copy — sourced from it below so the two can never
// drift apart.
export const PLATFORM_LIMITS: Record<
  Platform,
  { maxChars: number; maxImages: number | null; functional: boolean; notes?: string }
> = {
  linkedin: { maxChars: 3000, maxImages: 20, functional: PLATFORM_META.linkedin.functional },
  instagram: { maxChars: 2200, maxImages: 20, functional: PLATFORM_META.instagram.functional },
  facebook: { maxChars: 63206, maxImages: null, functional: PLATFORM_META.facebook.functional },
  pinterest: {
    maxChars: 500,
    maxImages: 1,
    functional: PLATFORM_META.pinterest.functional,
    notes: "Pinterest allows only 1 image per pin",
  },
  x: {
    maxChars: 280,
    maxImages: 4,
    functional: PLATFORM_META.x.functional,
    notes: "Free tier limit — X Premium accounts get up to 25,000 characters",
  },
  threads: { maxChars: 500, maxImages: 20, functional: PLATFORM_META.threads.functional },
}

// How many characters actually show before a platform's feed collapses the
// rest behind "...more" / "...see more" — soft, advisory data (varies by
// surface and isn't published by any platform), not a hard limit. Platforms
// with no well-known preview-truncation behavior (or where the whole
// caption is typically visible, like Threads/X's short-form norm) are
// omitted rather than guessed at.
const TRUNCATION_PREVIEW_CHARS: Partial<Record<Platform, number>> = {
  linkedin: 210,
  instagram: 125,
  facebook: 477,
  pinterest: 55, // ~50-60; search-relevant description text, most of which is what actually gets read
}

export interface PlatformValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Validates one piece of content against one platform's real limits.
// `errors` are hard violations (would be rejected/truncated if actually
// posted) — a caller should treat these as blocking for THAT platform only,
// never for an entire multi-platform post. `warnings` are soft advisory
// notes (e.g. feed-preview truncation) that never block anything.
export function validatePostForPlatform(
  caption: string,
  imageCount: number,
  platform: string,
): PlatformValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isValidPlatform(platform)) return { valid: true, errors, warnings } // unknown platform — nothing to check against

  const limits = PLATFORM_LIMITS[platform]
  const notesSuffix = limits.notes ? ` — ${limits.notes}` : ""

  const over = caption.trim().length - limits.maxChars
  if (over > 0) {
    errors.push(`${limits.maxChars} char limit exceeded by ${over}${notesSuffix}`)
  }

  if (limits.maxImages !== null && imageCount > limits.maxImages) {
    const noun = limits.maxImages === 1 ? "image" : "images"
    errors.push(`${imageCount} images over the ${limits.maxImages}-${noun} limit${notesSuffix}`)
  }

  const previewChars = TRUNCATION_PREVIEW_CHARS[platform]
  if (previewChars && caption.trim().length > previewChars) {
    warnings.push(
      `Only the first ~${previewChars} characters show before "more" on ${PLATFORM_META[platform].label} — make sure your hook is at the start.`,
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

// Convenience for the AI /generate flow (caption/image/carousel clients) —
// collapses validatePostForPlatform's result into one line for a single
// inline banner, or null when there's nothing worth surfacing. Errors take
// priority over warnings (a hard violation is more important to see than a
// soft truncation note).
export function captionLengthNotice(caption: string, platform: string | null): string | null {
  if (!platform || !caption.trim()) return null
  const { errors, warnings } = validatePostForPlatform(caption, 0, platform)
  const label = isValidPlatform(platform) ? PLATFORM_META[platform].label : platform
  if (errors.length > 0) return `Over ${label}'s limit: ${errors.join(", ")}`
  if (warnings.length > 0) return warnings[0]
  return null
}
