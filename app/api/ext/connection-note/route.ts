// app/api/ext/connection-note/route.ts — Connection Request Notes for the
// Comment extension. Same shape as app/api/ext/generate: Bearer-token auth, the
// shared daily generation limit, and the extension access gate
// (lib/extAccess.ts) reserved before the model call and given back if no note
// survives validation.
//
// Each note is saved to history (kind "connection_note"), so it shows in the
// History screens in the panel and on the website.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import { ANTI_FABRICATION_REMINDER, WEAK_COMMENT_PATTERNS } from "@/lib/ai/prompts/commentPrompt"
import {
  buildConnectionNoteSystemMessage,
  buildConnectionNoteUserMessage,
  trimToLimit,
  CONNECTION_NOTE_HARD_MAX,
  CONNECTION_NOTE_MIN,
  CONNECTION_NOTE_WEAK_PATTERNS,
  type ConnectionContextInput,
  type ConnectionProfileInput,
  type ConnectionTargetInput,
} from "@/lib/ai/prompts/connectionNotePrompt"
import { callCommentModel, parseComment, sanitizeComment, PRIMARY_MODEL } from "@/lib/ai/commentModel"
import { HISTORY_SNIPPET_CHARS, linkedInUrl } from "@/lib/extensionHistory"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"

const MAX_FIELD_CHARS = 300
const MAX_ABOUT_CHARS = 2000
const MAX_PURPOSE_CHARS = 400

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function parseTarget(raw: unknown): ConnectionTargetInput {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return {
    name: str(t.name, 100),
    headline: str(t.headline, MAX_FIELD_CHARS),
    currentRole: str(t.currentRole, MAX_FIELD_CHARS),
    about: str(t.about, MAX_ABOUT_CHARS),
  }
}

function parseContext(raw: unknown): ConnectionContextInput {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  if (c.kind === "profile") {
    const profile = parseTarget(c)
    if (!profile.name && !profile.headline && !profile.currentRole) {
      throw new Error("Your LinkedIn profile hasn't been read yet. Read it in Settings, or pick another context.")
    }
    return { kind: "profile", ...profile }
  }
  if (c.kind === "custom") {
    const purpose = str(c.purpose, MAX_PURPOSE_CHARS)
    if (!purpose) throw new Error("Your purpose is empty. Write one in Settings, or pick another context.")
    return { kind: "custom", purpose }
  }
  return { kind: "none" }
}

// "120-220 characters" -> the shape parseRange takes.
function rangeFromLength(length: string): { min?: number; max?: number } {
  const match = length.match(/(\d+)\s*-\s*(\d+)\s*char/i)
  // No range in the string: parseRange then falls back to the full bounds.
  return match ? { min: Number(match[1]), max: Number(match[2]) } : {}
}

// Clamped rather than rejected: an out-of-range request still gets a note, just
// never one over the hard ceiling.
function parseRange(raw: unknown): { min: number; max: number } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const clamp = (n: unknown, fallback: number) =>
    Math.min(CONNECTION_NOTE_HARD_MAX, Math.max(CONNECTION_NOTE_MIN, Math.round(Number(n) || fallback)))
  const min = clamp(r.min, CONNECTION_NOTE_MIN)
  const max = Math.max(min, clamp(r.max, CONNECTION_NOTE_HARD_MAX))
  return { min, max }
}

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const preflight = await engagePreflight(user.id, "connection_notes")
  if (preflight.response) return preflight.response

  let target: ConnectionTargetInput
  // The person's profile link, for History only; never sent to the model.
  let targetUrl: string
  let context: ConnectionContextInput
  let range: { min: number; max: number }
  let extraInstruction: string | undefined
  // Optional: without one the note falls back to the built-in rules alone.
  let profileId: string | undefined

  try {
    const body = await req.json()
    target = parseTarget(body.target)
    targetUrl = linkedInUrl(body.target?.url)
    context = parseContext(body.context)
    range = parseRange(body.length)
    profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : undefined
    extraInstruction = str(body.extraInstruction, 500) || undefined

    if (!target.name && !target.headline && !target.currentRole) {
      throw new Error("No profile details were captured. Click Connect on the profile again, then retry.")
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body"
    console.warn(`[ext/connection-note] rejected request: ${message}`)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // System profiles are shared; custom ones must belong to the caller.
  const profile = profileId
    ? await db.connectionProfile.findFirst({
        where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] },
      })
    : null

  if (profileId && !profile) {
    return NextResponse.json({ error: "Connection profile not found" }, { status: 404 })
  }

  // The profile's own range wins when it has one: it is what the user picked,
  // and the length rules were written alongside its samples.
  if (profile) range = parseRange(rangeFromLength(profile.length))

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveEngageGeneration(user.id, "connection_notes", preflight)
  if (!gate.ok) return gate.response

  const systemMessage = buildConnectionNoteSystemMessage(range, context.kind, profile as ConnectionProfileInput | null)
  const userMessage = buildConnectionNoteUserMessage(target, context, extraInstruction)

  const numberSources = [
    target.name,
    target.headline,
    target.currentRole,
    target.about,
    context.kind === "profile" ? `${context.headline} ${context.currentRole} ${context.about}` : "",
    context.kind === "custom" ? context.purpose : "",
    extraInstruction ?? "",
  ].join(" ")

  let note = ""
  // Clean but off-length, held in case the retry fails outright. Always within
  // the hard ceiling: an over-limit draft is trimmed before it is kept.
  let fallback = ""
  let remindAboutFabrication = false

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const message = remindAboutFabrication ? `${userMessage}\n\n${ANTI_FABRICATION_REMINDER}` : userMessage

    let raw: string
    try {
      raw = await callCommentModel(systemMessage, message, "ext/connection-note")
    } catch (err) {
      console.error(`[ext/connection-note] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const parsed = parseComment(raw)
    if (!parsed?.trim()) {
      console.warn(`[ext/connection-note] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const { comment: cleaned, removedChars } = sanitizeComment(parsed)
    if (!cleaned || removedChars > parsed.length * 0.25) {
      console.warn(`[ext/connection-note] attempt ${attempt}: ${removedChars} chars stripped, retrying`)
      continue
    }

    // Never kept, even as a fallback: the note goes out under the user's name.
    const unsourced = findUnsourcedNumbers(cleaned, numberSources)
    if (unsourced.length > 0) {
      console.warn(`[ext/connection-note] attempt ${attempt}: unsourced figures (${unsourced.join(", ")}), discarding`)
      remindAboutFabrication = true
      continue
    }

    const weak = [...CONNECTION_NOTE_WEAK_PATTERNS, ...WEAK_COMMENT_PATTERNS].filter(({ pattern }) =>
      pattern.test(cleaned),
    )
    if (weak.length > 0 && attempt === 1) {
      console.warn(`[ext/connection-note] attempt ${attempt}: weak patterns (${weak.map((w) => w.label).join(", ")}), retrying`)
      if (!fallback) fallback = trimToLimit(cleaned)
      continue
    }

    if (cleaned.length < range.min || cleaned.length > range.max) {
      console.warn(`[ext/connection-note] attempt ${attempt}: length ${cleaned.length} outside ${range.min}-${range.max}, retrying`)
      if (!fallback) fallback = trimToLimit(cleaned)
      continue
    }

    note = cleaned
    break
  }

  if (!note) note = fallback
  // Belt and braces: whatever path got here, nothing over the ceiling leaves.
  note = trimToLimit(note)

  if (!note) {
    await gate.release()
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }

  // Best effort: the note already exists, and failing the request over a
  // history write would lose it. A null historyId just means Copy/Insert
  // can't be recorded against a row.
  let historyId: string | null = null
  try {
    const history = await db.commentHistory.create({
      data: {
        userId: user.id,
        kind: "connection_note",
        profileId: profile?.id ?? null,
        profileName: profile?.name ?? "Custom note",
        postAuthor: target.name,
        postUrl: targetUrl,
        postSnippet: (target.headline || target.currentRole).slice(0, HISTORY_SNIPPET_CHARS),
        comment: note,
        action: "NONE",
        creditsUsed: 0,
        model: PRIMARY_MODEL,
      },
    })
    historyId = history.id
  } catch (err) {
    console.error("[ext/connection-note] history write failed:", err)
  }

  return NextResponse.json({ note, freeRemaining: gate.freeRemaining, historyId })
}
