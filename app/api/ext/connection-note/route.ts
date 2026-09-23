// ════════════════════════════════════════════════════════════════════════════
// TESTING PHASE ONLY - credit checks disabled as of 2026-09-22. MUST restore
// before public launch. See this comment in generate/route.ts, rewrite/route.ts
// and this file. The switch is COMMENT_CREDITS_ENFORCED in
// lib/commentCredits.ts; the balance check and charge below are skipped while
// it is false, not removed.
// ════════════════════════════════════════════════════════════════════════════
// app/api/ext/connection-note/route.ts — Connection Request Notes for the
// Comment extension. Same shape as app/api/ext/generate: Bearer-token auth, a
// per-user rate limit, the balance checked before any model call and charged
// only after a note survives validation.
//
// No CommentHistory row is written: that table requires a comment profileId,
// which a connection note doesn't have. Notes are not in History for now.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { availableCredits } from "@/lib/credits"
import { chargeCreditsForAction } from "@/lib/chargeCredits"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { COMMENT_CREDITS_ENFORCED } from "@/lib/commentCredits"
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
import { callCommentModel, parseComment, sanitizeComment } from "@/lib/ai/commentModel"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"

// Same limit as generate and rewrite. Independent of COMMENT_CREDITS_ENFORCED,
// so it stays the brake on model spend while credits are off.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(40, "1 h"),
  analytics: false,
})

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

  const { success } = await ratelimit.limit(`ext:connection-note:${user.id}`)
  if (!success) {
    return NextResponse.json({ error: "Too many notes generated. Please try again later." }, { status: 429 })
  }

  let target: ConnectionTargetInput
  let context: ConnectionContextInput
  let range: { min: number; max: number }
  let extraInstruction: string | undefined
  // Optional: without one the note falls back to the built-in rules alone.
  let profileId: string | undefined

  try {
    const body = await req.json()
    target = parseTarget(body.target)
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
  const [subscription, profile] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id } }),
    profileId
      ? db.connectionProfile.findFirst({
          where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] },
        })
      : Promise.resolve(null),
  ])

  if (profileId && !profile) {
    return NextResponse.json({ error: "Connection profile not found" }, { status: 404 })
  }

  // The profile's own range wins when it has one: it is what the user picked,
  // and the length rules were written alongside its samples.
  if (profile) range = parseRange(rangeFromLength(profile.length))

  // TESTING PHASE ONLY: skipped while COMMENT_CREDITS_ENFORCED is false.
  if (
    COMMENT_CREDITS_ENFORCED &&
    (!subscription || availableCredits(subscription) < CREDIT_COSTS.connection_note)
  ) {
    return NextResponse.json(
      { error: "You're out of credits.", requiresUpgrade: subscription?.plan === "FREE" },
      { status: 402 },
    )
  }

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
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }

  // TESTING PHASE ONLY: no charge while COMMENT_CREDITS_ENFORCED is false.
  let creditsRemaining = subscription ? availableCredits(subscription) : 0
  if (COMMENT_CREDITS_ENFORCED) {
    const charge = await chargeCreditsForAction({ ...user, subscription }, "connection_note")
    if (!charge.ok) {
      return NextResponse.json(
        { error: "You're out of credits.", requiresUpgrade: charge.requiresUpgrade },
        { status: 402 },
      )
    }
    creditsRemaining = charge.remaining
  }

  return NextResponse.json({ note, creditsRemaining })
}
