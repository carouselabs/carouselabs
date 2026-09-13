// lib/url.ts — small generic URL helpers shared across features that store
// a user-supplied destination URL (Start Page links, Short Links).

// Blocks javascript:/data:/vbscript: schemes (an XSS-via-redirect vector) —
// otherwise the owner can point their own link at whatever they want, same
// as any link-shortener/link-in-bio product; this isn't a general
// open-redirect concern since the destination is configured by the
// authenticated owner, not by an anonymous visitor.
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

// Random base62 slug (default 7 chars — ~3.5 trillion combinations, plenty
// for collision avoidance with a simple retry loop rather than anything
// fancier).
const SLUG_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

export function randomSlug(length = 7): string {
  let s = ""
  for (let i = 0; i < length; i++) {
    s += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)]
  }
  return s
}
