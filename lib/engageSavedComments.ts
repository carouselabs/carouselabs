// lib/engageSavedComments.ts — comments a person keeps to use again (model
// EngageSavedComment; Engage → Saved comments in LinkedIn's side panel and on
// the website): what one holds, how it's checked, and how it's sent back.
// Shared by every app/api/ext/saved-comments route, so the panel and the
// website save under exactly the same rules.
//
// Nothing here involves AI: a saved comment is inserted or copied exactly as
// written.
import type { EngageSavedComment } from "@prisma/client"

// When the panel offers a saved comment the first time a post is opened:
// on your own posts (a creator's usual pinned comment), on every post, or
// never.
export const REMIND_ON = ["own", "any", "off"] as const
export type RemindOn = (typeof REMIND_ON)[number]

export const SAVED_COMMENT_LIMITS = {
  perUser: 500,
  title: 80,
  // LinkedIn's own limit on one comment.
  body: 1250,
  tags: 8,
  tag: 24,
  // Rows one CSV import may bring in.
  importRows: 500,
} as const

export interface SavedCommentInput {
  title: string
  body: string
  tags: string[]
  favorite: boolean
  remindOn: RemindOn
}

export interface SavedCommentForClient extends SavedCommentInput {
  id: string
  useCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value)

// The text as LinkedIn will get it: Windows line breaks made plain, no spaces
// trailing a line, at most two empty lines in a row, nothing around it.
export function cleanBody(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
}

// A name from the text when none is given: its first line, cut at a word.
export function titleFrom(body: string): string {
  const first = cleanBody(body).split("\n").find((line) => line.trim()) ?? ""
  const line = first.replace(/\s+/g, " ").trim()
  if (line.length <= 48) return line
  const cut = line.slice(0, 48)
  const space = cut.lastIndexOf(" ")
  return `${(space > 24 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, "")}…`
}

// Tags as typed, without a leading #, each once (ignoring case), at most
// SAVED_COMMENT_LIMITS.tags.
export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of value) {
    if (typeof raw !== "string") continue
    const tag = raw.replace(/^#+/, "").replace(/\s+/g, " ").trim().slice(0, SAVED_COMMENT_LIMITS.tag).trim()
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    tags.push(tag)
    if (tags.length === SAVED_COMMENT_LIMITS.tags) break
  }
  return tags
}

function parseBody(value: unknown): Parsed<string> {
  const body = typeof value === "string" ? cleanBody(value) : ""
  if (!body) return { ok: false, error: "Write the comment first." }
  if (body.length > SAVED_COMMENT_LIMITS.body) {
    return {
      ok: false,
      error: `A LinkedIn comment can be at most 1,250 characters. This one is ${body.length.toLocaleString("en-US")}.`,
    }
  }
  return { ok: true, value: body }
}

function parseTitle(value: unknown): Parsed<string> {
  if (value !== undefined && value !== null && typeof value !== "string") return { ok: false, error: "The name must be text." }
  const title = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
  if (title.length > SAVED_COMMENT_LIMITS.title) {
    return { ok: false, error: `Keep the name under ${SAVED_COMMENT_LIMITS.title} characters.` }
  }
  return { ok: true, value: title }
}

function parseRemindOn(value: unknown): Parsed<RemindOn> {
  return REMIND_ON.includes(value as RemindOn)
    ? { ok: true, value: value as RemindOn }
    : { ok: false, error: "remindOn must be own, any or off." }
}

// A whole saved comment (a new one, or a row of an import). Only the text is
// required: the name comes from its first line when left blank, and the
// reminder is on for your own posts unless said otherwise.
export function parseSavedComment(value: unknown): Parsed<SavedCommentInput> {
  const input = isRecord(value) ? value : {}
  const body = parseBody(input.body)
  if (!body.ok) return body
  const title = parseTitle(input.title)
  if (!title.ok) return title
  const remindOn = input.remindOn === undefined ? ({ ok: true, value: "own" } as const) : parseRemindOn(input.remindOn)
  if (!remindOn.ok) return remindOn
  if (input.favorite !== undefined && typeof input.favorite !== "boolean") return { ok: false, error: "favorite must be true or false." }
  return {
    ok: true,
    value: {
      title: title.value || titleFrom(body.value),
      body: body.value,
      tags: normalizeTags(input.tags),
      favorite: input.favorite === true,
      remindOn: remindOn.value,
    },
  }
}

// An edit: only the fields sent change. A name cleared while the text
// changes is taken from the new text; cleared on its own, it's refused.
export function parseSavedCommentChanges(value: unknown): Parsed<Partial<SavedCommentInput>> {
  if (!isRecord(value)) return { ok: false, error: "Invalid request body" }
  const changes: Partial<SavedCommentInput> = {}
  if ("body" in value) {
    const body = parseBody(value.body)
    if (!body.ok) return body
    changes.body = body.value
  }
  if ("title" in value) {
    const title = parseTitle(value.title)
    if (!title.ok) return title
    if (!title.value && !changes.body) return { ok: false, error: "Give it a name." }
    changes.title = title.value || titleFrom(changes.body as string)
  }
  if ("tags" in value) {
    if (!Array.isArray(value.tags)) return { ok: false, error: "tags must be a list." }
    changes.tags = normalizeTags(value.tags)
  }
  if ("favorite" in value) {
    if (typeof value.favorite !== "boolean") return { ok: false, error: "favorite must be true or false." }
    changes.favorite = value.favorite
  }
  if ("remindOn" in value) {
    const remindOn = parseRemindOn(value.remindOn)
    if (!remindOn.ok) return remindOn
    changes.remindOn = remindOn.value
  }
  if (Object.keys(changes).length === 0) return { ok: false, error: "Nothing to change." }
  return { ok: true, value: changes }
}

// The same text, ignoring case and spacing: how an import spots one that's
// already saved.
export const sameText = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase()

export function savedCommentForClient(row: EngageSavedComment): SavedCommentForClient {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags,
    favorite: row.favorite,
    remindOn: REMIND_ON.includes(row.remindOn as RemindOn) ? (row.remindOn as RemindOn) : "off",
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// Favorites first, then the ones used most recently, then the newest.
export const SAVED_COMMENT_ORDER = [
  { favorite: "desc" as const },
  { lastUsedAt: { sort: "desc" as const, nulls: "last" as const } },
  { createdAt: "desc" as const },
]
