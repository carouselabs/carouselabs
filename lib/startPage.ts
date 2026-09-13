// lib/startPage.ts — shared validation for the Start Page (link-in-bio)
// feature, used by both app/api/start-page/* routes and the editor UI.

// Lowercase alphanumeric + hyphens, 3-30 chars, no leading/trailing hyphen —
// keeps carouselabs.com/start/<slug> URLs clean and unambiguous.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug)
}

// Blocks javascript:/data:/vbscript: schemes (an XSS-via-redirect vector) —
// otherwise the owner can point their own link at whatever they want, same
// as any link-in-bio product; this isn't a general open-redirect concern
// since the destination is configured by the authenticated page owner, not
// by an anonymous visitor.
export function isSafeLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export const START_PAGE_THEMES = ["default", "dark", "minimal"] as const
export type StartPageTheme = (typeof START_PAGE_THEMES)[number]

export function isValidTheme(val: unknown): val is StartPageTheme {
  return START_PAGE_THEMES.includes(val as StartPageTheme)
}
