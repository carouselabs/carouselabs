// lib/startPage.ts — shared validation for the Start Page (link-in-bio)
// feature, used by both app/api/start-page/* routes and the editor UI.
import { isSafeHttpUrl } from "@/lib/url"

// Lowercase alphanumeric + hyphens, 3-30 chars, no leading/trailing hyphen —
// keeps carouselabs.com/start/<slug> URLs clean and unambiguous.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

// Re-exported under this feature's own name — see lib/url.ts for the
// (generic, shared-with-ShortLink) implementation.
export const isSafeLinkUrl = isSafeHttpUrl

export const START_PAGE_THEMES = ["default", "dark", "minimal"] as const
export type StartPageTheme = (typeof START_PAGE_THEMES)[number]

export function isValidTheme(val: unknown): val is StartPageTheme {
  return START_PAGE_THEMES.includes(val as StartPageTheme)
}
