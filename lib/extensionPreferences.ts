// lib/extensionPreferences.ts — validation for the extension settings that
// moved out of one browser into the account (User.connectNoteContext,
// .connectNoteLength, .linkedinProfile, and ContactContext rows), so the
// website's Extension section can edit them too. Pure, so the extension's
// test suite covers it directly. Each parser returns the cleaned value, or
// an error string naming the problem; null always means "clear it".
//
// The shapes mirror what the side panel stored locally
// (browser-extension-comment/src/lib/connectionNote.ts, messageThread.ts),
// so a value round-trips between the two without translation.

// Mirrors CONNECTION_NOTE_MIN / CONNECTION_NOTE_HARD_MAX in
// lib/ai/prompts/connectionNotePrompt.ts and the panel's CONNECT_NOTE_*.
export const NOTE_MIN = 40
export const NOTE_MAX = 280
export const NOTE_LENGTH_PRESETS = {
  short: { min: 80, max: 150 },
  medium: { min: 150, max: NOTE_MAX },
} as const

const MAX_PURPOSE = 400
const MAX_MESSAGE_PURPOSE = 400

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

export interface ConnectNoteContext {
  choice: "profile" | "custom" | "none"
  purpose: string
}

export function parseConnectNoteContext(v: unknown): Parsed<ConnectNoteContext | null> {
  if (v === null) return { ok: true, value: null }
  const o = obj(v)
  if (!o || (o.choice !== "profile" && o.choice !== "custom" && o.choice !== "none")) {
    return { ok: false, error: 'connectNoteContext.choice must be "profile", "custom" or "none"' }
  }
  // An empty purpose is allowed even for "custom": the panel saves the choice
  // the moment it's picked, before anything is typed. Generation refuses an
  // empty purpose itself (app/api/ext/connection-note).
  return { ok: true, value: { choice: o.choice, purpose: str(o.purpose, MAX_PURPOSE) } }
}

export interface ConnectNoteLength {
  preset: "short" | "medium" | "custom"
  min: number
  max: number
}

export function parseConnectNoteLength(v: unknown): Parsed<ConnectNoteLength | null> {
  if (v === null) return { ok: true, value: null }
  const o = obj(v)
  if (!o || (o.preset !== "short" && o.preset !== "medium" && o.preset !== "custom")) {
    return { ok: false, error: 'connectNoteLength.preset must be "short", "medium" or "custom"' }
  }
  // A preset's range is fixed; only "custom" takes the numbers given.
  if (o.preset !== "custom") return { ok: true, value: { preset: o.preset, ...NOTE_LENGTH_PRESETS[o.preset] } }
  const min = Math.round(Number(o.min))
  const max = Math.round(Number(o.max))
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < NOTE_MIN || max > NOTE_MAX || min > max) {
    return { ok: false, error: `Note length must be between ${NOTE_MIN} and ${NOTE_MAX} characters, minimum first` }
  }
  return { ok: true, value: { preset: "custom", min, max } }
}

export interface LinkedinProfile {
  name: string
  headline: string
  currentRole: string
  about: string
  url: string
  // When it was read or last edited; the newer of the panel's copy and the
  // account's wins (browser-extension-comment/src/lib/syncedSettings.ts).
  capturedAt: number
}

export function parseLinkedinProfile(v: unknown): Parsed<LinkedinProfile | null> {
  if (v === null) return { ok: true, value: null }
  const o = obj(v)
  if (!o) return { ok: false, error: "linkedinProfile must be an object or null" }
  const value: LinkedinProfile = {
    name: str(o.name, 100),
    headline: str(o.headline, 300),
    currentRole: str(o.currentRole, 300),
    about: str(o.about, 2000),
    url: typeof o.url === "string" && /^https:\/\/www\.linkedin\.com\//.test(o.url) ? o.url.slice(0, 300) : "",
    capturedAt: Number.isFinite(Number(o.capturedAt)) && Number(o.capturedAt) > 0 ? Number(o.capturedAt) : Date.now(),
  }
  if (!value.name) return { ok: false, error: "Your LinkedIn profile needs at least a name" }
  return { ok: true, value }
}

// The contact key the extension reads off LinkedIn: a lowercase "/in/…" path.
export function isContactUrl(v: unknown): v is string {
  return typeof v === "string" && v.length <= 200 && /^\/in\/[a-z0-9\-_%.]+$/.test(v)
}

export interface ContactContextInput {
  contactUrl: string
  contactName: string
  choice: "profile" | "custom" | "flow"
  profileId: string | null
  purpose: string
  tone: string
}

export function parseContactContext(body: unknown): Parsed<ContactContextInput> {
  const o = obj(body)
  if (!o) return { ok: false, error: "Invalid request body" }
  if (!isContactUrl(o.contactUrl)) return { ok: false, error: "contactUrl must be a LinkedIn profile path (/in/…)" }
  if (o.choice !== "profile" && o.choice !== "custom" && o.choice !== "flow") {
    return { ok: false, error: 'choice must be "profile", "custom" or "flow"' }
  }
  const value: ContactContextInput = {
    contactUrl: o.contactUrl,
    contactName: str(o.contactName, 100),
    choice: o.choice,
    profileId: str(o.profileId, 40) || null,
    purpose: str(o.purpose, MAX_MESSAGE_PURPOSE),
    tone: str(o.tone, 60),
  }
  // Like the note context above, a choice is saved as soon as it's picked, so
  // an empty profileId or purpose is allowed here; generation checks them.
  return { ok: true, value }
}
