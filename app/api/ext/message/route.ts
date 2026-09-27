// app/api/ext/message/route.ts — the Conversation Assistant. Same shape as
// app/api/ext/connection-note: Bearer-token auth, the shared daily generation
// limit, and the extension access gate (lib/extAccess.ts) reserved before the
// model call and given back if no message survives validation.
//
// Each message is saved to history (kind "message"), so it shows in the
// History screens in the panel and on the website.
import { NextResponse } from "next/server"
import { extDailyLimitResponse } from "@/lib/extDailyLimit"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { reserveExtGeneration } from "@/lib/extAccess"
import { ANTI_FABRICATION_REMINDER, WEAK_COMMENT_PATTERNS } from "@/lib/ai/prompts/commentPrompt"
import {
  buildMessageSystemMessage,
  buildMessageUserMessage,
  MESSAGE_WEAK_PATTERNS,
  PLACEHOLDER_BRACKET_PATTERN,
  type MessageContactInput,
  type MessageProfileInput,
  type MessageThreadEntryInput,
} from "@/lib/ai/prompts/messagePrompt"
import { callCommentModel, parseComment, sanitizeComment, PRIMARY_MODEL } from "@/lib/ai/commentModel"
import { HISTORY_SNIPPET_CHARS, linkedInUrl } from "@/lib/extensionHistory"
import { findUnsourcedNumbers } from "@/lib/ai/numberGuard"

const MAX_FIELD_CHARS = 300
const MAX_MESSAGE_CHARS = 4000
const MAX_THREAD_ENTRIES = 60
const MAX_GOAL_CHARS = 400

// Truncates by Unicode code point rather than raw UTF-16 slice: a plain
// .slice(0, max) can cut a surrogate pair in half (e.g. mid-emoji, and this
// thread text routinely has emoji — see messageThread.ts's own captures),
// leaving a lone surrogate that then gets embedded in the model prompt.
function safeSlice(value: string, max: number): string {
  return Array.from(value).slice(0, max).join("")
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? safeSlice(value.trim(), max) : ""
}

function parseContact(raw: unknown): MessageContactInput {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  return { name: str(c.name, 100), headline: str(c.headline, MAX_FIELD_CHARS) }
}

// A long thread is trimmed to the most recent entries: what was said a
// hundred messages ago matters far less than the last few, and this keeps
// the prompt bounded regardless of how old the conversation is.
function parseThread(raw: unknown): MessageThreadEntryInput[] {
  if (!Array.isArray(raw)) return []
  const entries: MessageThreadEntryInput[] = raw
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e): MessageThreadEntryInput => ({
      sender: e.sender === "me" || e.sender === "them" ? (e.sender as "me" | "them") : "unknown",
      text: typeof e.text === "string" ? safeSlice(e.text.trim(), MAX_MESSAGE_CHARS) : "",
    }))
    .filter((e) => e.text)
  return entries.slice(-MAX_THREAD_ENTRIES)
}

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const limited = await extDailyLimitResponse(user.id)
  if (limited) return limited

  // Used only when the caller asked for "flow" mode (no saved profile, no
  // typed reason) — read the thread and continue it naturally instead of
  // aiming at anything specific. Makes little sense with an empty thread
  // (nothing to continue), but is still allowed: it just falls back to a
  // generic-but-real opener rather than erroring.
  const FLOW_DEFAULT_GOAL =
    "No specific reason was given for this conversation. Read the thread in <thread> carefully and continue it naturally, staying consistent with what's already been said. If the thread is empty, write a warm, genuine opener with no particular angle."

  let contact: MessageContactInput
  // The conversation's link, for History only; never sent to the model.
  let threadUrl: string
  let thread: MessageThreadEntryInput[]
  let goal: string | undefined
  let tone: string | undefined
  let flow: boolean
  let extraInstruction: string | undefined
  // Optional: a saved MessageProfile. Without one, `goal` (the typed reason)
  // or `flow` must be present instead — three-way either/or, unlike the
  // connection-note route's two-way "profile" vs "custom".
  let profileId: string | undefined

  try {
    const body = await req.json()
    contact = parseContact(body.contact)
    threadUrl =
      typeof body.threadPath === "string" && body.threadPath.startsWith("/messaging/thread/")
        ? linkedInUrl(`https://www.linkedin.com${body.threadPath}`)
        : ""
    thread = parseThread(body.thread)
    profileId = typeof body.profileId === "string" && body.profileId ? body.profileId : undefined
    goal = str(body.goal, MAX_GOAL_CHARS) || undefined
    flow = body.flow === true
    // Meaningful regardless of profileId/goal: it can override a saved
    // profile's own baked-in tone for just this one generation. Free text,
    // same as MessageProfile's own tone field — no allowlist, so "Casual, a
    // bit of slang" works as well as "Professional".
    tone = str(body.tone, 60) || undefined
    extraInstruction = str(body.extraInstruction, 500) || undefined

    if (!profileId && !goal && !flow) {
      throw new Error("No reason was given for this conversation. Pick a saved reason, write one, or choose \"Just continue\", then retry.")
    }
    if (!contact.name) {
      throw new Error("No conversation was captured. Click \"Read this conversation\" again, then retry.")
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body"
    console.warn(`[ext/message] rejected request: ${message}`)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // System profiles are shared; custom ones must belong to the caller.
  const profile = profileId
    ? await db.messageProfile.findFirst({
        where: { id: profileId, OR: [{ isSystem: true }, { userId: user.id }] },
      })
    : null

  if (profileId && !profile) {
    return NextResponse.json({ error: "Message profile not found" }, { status: 404 })
  }

  // A saved profile can still have its tone overridden for one generation.
  // Without a saved profile, a typed reason (or the flow default) becomes a
  // one-off profile, no samples, same "custom" idea connection notes use.
  const profileInput: MessageProfileInput = profile
    ? { ...profile, tone: tone || profile.tone }
    : { goal: goal ?? FLOW_DEFAULT_GOAL, tone: tone || "Natural" }

  // Last check before the model call, so a blocked account never burns one.
  const gate = await reserveExtGeneration(user.id)
  if (!gate.ok) return gate.response

  const isOpener = thread.length === 0
  const systemMessage = buildMessageSystemMessage(profileInput, isOpener)
  const userMessage = buildMessageUserMessage(contact, thread, extraInstruction)

  const numberSources = [
    contact.name,
    contact.headline,
    profileInput.goal,
    extraInstruction ?? "",
    ...thread.map((entry) => entry.text),
  ].join(" ")

  let message = ""
  // Clean but weak-patterned, held in case the retry fails outright.
  let fallback = ""
  let remindAboutFabrication = false

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const userContent = remindAboutFabrication ? `${userMessage}\n\n${ANTI_FABRICATION_REMINDER}` : userMessage

    let raw: string
    try {
      raw = await callCommentModel(systemMessage, userContent, "ext/message")
    } catch (err) {
      console.error(`[ext/message] attempt ${attempt}: both models failed:`, err)
      continue
    }

    const parsed = parseComment(raw)
    if (!parsed?.trim()) {
      console.warn(`[ext/message] attempt ${attempt}: unparseable response:`, raw.slice(0, 300))
      continue
    }

    const { comment: cleaned, removedChars } = sanitizeComment(parsed)
    if (!cleaned || removedChars > parsed.length * 0.25) {
      console.warn(`[ext/message] attempt ${attempt}: ${removedChars} chars stripped, retrying`)
      continue
    }

    // Never kept, even as a fallback: the message goes out under the user's
    // name, to someone they are trying to build a real relationship with.
    const unsourced = findUnsourcedNumbers(cleaned, numberSources)
    if (unsourced.length > 0) {
      console.warn(`[ext/message] attempt ${attempt}: unsourced figures (${unsourced.join(", ")}), discarding`)
      remindAboutFabrication = true
      continue
    }

    // Same reasoning as unsourced numbers: a literal "[their industry]" left
    // in the output is a template, not a message, and must never be sent.
    if (PLACEHOLDER_BRACKET_PATTERN.test(cleaned)) {
      console.warn(`[ext/message] attempt ${attempt}: unfilled placeholder bracket, discarding`)
      continue
    }

    const weak = [...MESSAGE_WEAK_PATTERNS, ...WEAK_COMMENT_PATTERNS].filter(({ pattern }) => pattern.test(cleaned))
    if (weak.length > 0 && attempt === 1) {
      console.warn(`[ext/message] attempt ${attempt}: weak patterns (${weak.map((w) => w.label).join(", ")}), retrying`)
      if (!fallback) fallback = cleaned
      continue
    }

    message = cleaned
    break
  }

  if (!message) message = fallback

  if (!message) {
    await gate.release()
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }

  // What this message answers: their latest message, or the opener marker.
  const lastFromThem = [...thread].reverse().find((entry) => entry.sender === "them")
  const answered = isOpener ? "Opening message" : (lastFromThem ?? thread[thread.length - 1]).text

  // Best effort, same as connection-note: the message already exists.
  let historyId: string | null = null
  try {
    const history = await db.commentHistory.create({
      data: {
        userId: user.id,
        kind: "message",
        profileId: profile?.id ?? null,
        profileName: profile?.name ?? (flow && !goal ? "Just continue" : "Custom reason"),
        postAuthor: contact.name,
        postUrl: threadUrl,
        postSnippet: answered.slice(0, HISTORY_SNIPPET_CHARS),
        comment: message,
        action: "NONE",
        creditsUsed: 0,
        model: PRIMARY_MODEL,
      },
    })
    historyId = history.id
  } catch (err) {
    console.error("[ext/message] history write failed:", err)
  }

  return NextResponse.json({ message, freeRemaining: gate.freeRemaining, historyId })
}
