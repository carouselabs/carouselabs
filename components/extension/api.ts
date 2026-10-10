// components/extension/api.ts — the website's Extension section talks to the
// same app/api/ext/* routes as the side panel, signed in with the normal
// website session instead of the extension's token (see getExtensionUser in
// lib/extensionCommentAuth.ts). Same routes, same rules: a profile saved here
// is exactly what the extension would have saved.

export class ExtApiError extends Error {
  status: number
  // The error response's JSON body (e.g. the current agent on a 409).
  data: Record<string, unknown>
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function extApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    cache: "no-store",
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new ExtApiError(res.status, typeof body.error === "string" ? body.error : `Request failed (${res.status})`, body)
  }
  return body as T
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong, try again"

// ── Response shapes (mirror the routes) ─────────────────────────────────────

export interface CommentProfile {
  id: string
  userId: string | null
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
  isSystem: boolean
  isRecommended: boolean
}

export interface ConnectionProfile {
  id: string
  name: string
  angle: string
  goal: string
  tone: string
  length: string
  alwaysDo: string | null
  neverDo: string | null
  samples: string[]
  isSystem: boolean
  isRecommended: boolean
}

export interface MessageProfile {
  id: string
  name: string
  goal: string
  tone: string
  alwaysDo: string | null
  neverDo: string | null
  samples: string[]
  isSystem: boolean
  isRecommended: boolean
}

export interface ExtSettings {
  defaultCommentProfileId: string | null
  defaultConnectionProfileId: string | null
  defaultMessageProfileId: string | null
  defaultLanguage: string | null
  // Settings that used to live only in the extension's browser storage
  // (lib/extensionPreferences.ts). null = never set.
  connectNoteContext: { choice: "profile" | "custom" | "none"; purpose: string } | null
  connectNoteLength: { preset: "short" | "medium" | "custom"; min: number; max: number } | null
  linkedinProfile: LinkedinProfile | null
  insertButtonHidden: boolean | null
}

export interface LinkedinProfile {
  name: string
  headline: string
  currentRole: string
  about: string
  url: string
  capturedAt: number
}

export interface ContactContext {
  id: string
  contactUrl: string
  contactName: string
  choice: "profile" | "custom" | "flow"
  profileId: string | null
  purpose: string
  tone: string
  updatedAt: string
}

export interface ExtMe
  extends Pick<
    ExtSettings,
    | "defaultCommentProfileId"
    | "defaultConnectionProfileId"
    | "defaultMessageProfileId"
    | "defaultLanguage"
  > {
  email: string
  plan: string
  commentsThisMonth: number
  commentsToday: number
}

// x_reply / x_message: CarouseLabs Engage for X, listed with ?platform=x.
export type HistoryKind = "comment" | "reply" | "connection_note" | "message" | "x_reply" | "x_message"

export interface HistoryEntry {
  id: string
  kind: HistoryKind
  postAuthor: string
  postUrl: string
  postSnippet: string
  comment: string
  action: "NONE" | "COPIED" | "INSERTED"
  createdAt: string
  profileName: string
}

// CarouseLabs Engage for X's settings (app/api/ext/x/settings).
export interface XSettings {
  defaultProfileId: string | null
  maxReplyLength: number
  insertButtonHidden: boolean
}

export interface ExtDevice {
  id: string
  device: string | null
  lastUsedAt: string
  createdAt: string
}

export interface ExtPayment {
  id: string
  date: string
  amount: string
  status: string
  statusLabel: string
  reason: string
  card: string | null
  invoiceUrl: string | null
}

// Mirrors LANGUAGES in app/api/ext/settings/route.ts, which rejects anything else.
export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"]

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
