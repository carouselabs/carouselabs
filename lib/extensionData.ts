// lib/extensionData.ts
// What the extensions' account routes (app/api/ext/*) answer with: the voice
// profile lists, the settings and the remembered conversations. Read here, in
// one place, because the website's Custom tones pages load the same things on
// the server (app/(app)/extension/profiles, .../x/profiles) and must show
// exactly what the routes would. The routes still do the signing in and the
// validation; this is only the reading.
import type { User } from "@prisma/client"
import { db } from "@/lib/db"
import { X_MAX_LENGTH } from "@/lib/xText"

// A value exactly as a route sends it (NextResponse.json: dates become
// strings), which is what the pages hand the browser too.
export function asJson<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ── Voice profile lists ─────────────────────────────────────────────────────
// Every built-in profile (isSystem, shared by everyone; see
// scripts/seed-comment-profiles.js) plus the user's own: recommended presets
// first, then the other built-ins, then the user's own, oldest first. Ordered
// here rather than in each screen so the panel's dropdowns and the website's
// lists can't disagree.

const visibleTo = (userId: string) => ({ OR: [{ isSystem: true }, { userId }] })
const order = () => [{ isRecommended: "desc" as const }, { isSystem: "desc" as const }, { createdAt: "asc" as const }]

export const listCommentProfiles = (userId: string) =>
  db.commentProfile.findMany({ where: visibleTo(userId), orderBy: order() })

export const listConnectionProfiles = (userId: string) =>
  db.connectionProfile.findMany({ where: visibleTo(userId), orderBy: order() })

export const listMessageProfiles = (userId: string) =>
  db.messageProfile.findMany({ where: visibleTo(userId), orderBy: order() })

export const listXProfiles = (userId: string) =>
  db.xProfile.findMany({ where: visibleTo(userId), orderBy: order() })

// ── LinkedIn extension settings (GET /api/ext/settings) ─────────────────────
// All of it lives on the user's own row, so it costs no query of its own.

export function extensionSettingsOf(user: User) {
  return {
    defaultCommentProfileId: user.defaultCommentProfileId,
    defaultConnectionProfileId: user.defaultConnectionProfileId,
    defaultMessageProfileId: user.defaultMessageProfileId,
    defaultLanguage: user.defaultLanguage,
    // No Insert warning any more; extensions before 1.3.0 still read this.
    insertWarningHidden: true,
    connectNoteContext: user.connectNoteContext,
    connectNoteLength: user.connectNoteLength,
    linkedinProfile: user.linkedinProfile,
    insertButtonHidden: user.insertButtonHidden,
  }
}

// ── Remembered conversations (model ContactContext, /api/ext/contacts) ──────

export const CONTACT_LIST_LIMIT = 200

export const contactJson = (row: {
  id: string
  contactUrl: string
  contactName: string
  choice: string
  profileId: string | null
  agentId: string | null
  purpose: string
  tone: string
  updatedAt: Date
}) => ({
  id: row.id,
  contactUrl: row.contactUrl,
  contactName: row.contactName,
  choice: row.choice,
  profileId: row.profileId,
  agentId: row.agentId,
  purpose: row.purpose,
  tone: row.tone,
  updatedAt: row.updatedAt.toISOString(),
})

// Most recent first.
export async function listContacts(userId: string) {
  const rows = await db.contactContext.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: CONTACT_LIST_LIMIT,
  })
  return rows.map(contactJson)
}

// ── Engage for X settings (XUserSettings, /api/ext/x/settings) ──────────────
// No row yet means the defaults.

export const X_SETTINGS_DEFAULTS = {
  defaultProfileId: null as string | null,
  maxReplyLength: X_MAX_LENGTH,
  insertButtonHidden: false,
}

export const X_SETTINGS_SELECT = { defaultProfileId: true, maxReplyLength: true, insertButtonHidden: true } as const

export function xSettingsOf(row: typeof X_SETTINGS_DEFAULTS | null) {
  return {
    defaultProfileId: row?.defaultProfileId ?? null,
    maxReplyLength: row?.maxReplyLength ?? X_MAX_LENGTH,
    insertButtonHidden: row?.insertButtonHidden ?? false,
  }
}

export async function loadXSettings(userId: string) {
  return xSettingsOf(await db.xUserSettings.findUnique({ where: { userId }, select: X_SETTINGS_SELECT }))
}
