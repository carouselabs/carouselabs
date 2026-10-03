// lib/xReply.ts — reading and checking the body of CarouseLabs Engage for
// X's Reply request (app/api/ext/x/reply). Everything in it was scraped from
// x.com, so it is capped and cleaned before it goes near a prompt.
import type { XPostInput, XReplyInput } from "@/lib/ai/prompts/xReplyPrompt"

// Caps on what arrives from a scraped page: enough for any real post and
// thread, small enough that one request can't carry a huge prompt.
const MAX_POST_CHARS = 4000
const MAX_THREAD_POSTS = 10
const MEDIA = new Set(["image", "video", "gif", "poll", "link"])

// An x.com post's own address, or "" (the History screens make it a link).
export function xPostUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  try {
    const url = new URL(value.trim().slice(0, 500))
    if (url.protocol !== "https:" || (url.hostname !== "x.com" && url.hostname !== "twitter.com")) return ""
    if (!/^\/[A-Za-z0-9_]{1,15}\/status\/\d+\/?$/.test(url.pathname)) return ""
    return `https://x.com${url.pathname.replace(/\/$/, "")}`
  } catch {
    return ""
  }
}

function parsePost(raw: unknown): XPostInput | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const handle = typeof r.handle === "string" ? r.handle.trim().replace(/^@/, "") : ""
  return {
    author: typeof r.author === "string" ? r.author.trim().slice(0, 100) : "",
    handle: /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : "",
    text: typeof r.text === "string" ? r.text.trim().slice(0, MAX_POST_CHARS) : "",
    url: xPostUrl(r.url),
    media: Array.isArray(r.media)
      ? [...new Set(r.media.filter((m): m is string => typeof m === "string" && MEDIA.has(m)))]
      : [],
  }
}

// The request body, or an error message for a 400.
export function parseReplyBody(body: unknown):
  | { ok: true; profileId: string; input: XReplyInput; extraInstruction?: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" }
  const b = body as Record<string, unknown>
  const profileId = typeof b.profileId === "string" ? b.profileId : ""
  if (!profileId) return { ok: false, error: "Missing profileId" }

  const post = parsePost(b.post)
  if (!post || (!post.text && post.media.length === 0)) {
    return { ok: false, error: "No post was captured. Click Reply on the post again, then retry." }
  }
  const thread = Array.isArray(b.thread)
    ? b.thread.map(parsePost).filter((p): p is XPostInput => p !== null && (p.text !== "" || p.media.length > 0))
    : []
  const extraInstruction =
    typeof b.extraInstruction === "string" && b.extraInstruction.trim() ? b.extraInstruction.trim().slice(0, 500) : undefined

  return {
    ok: true,
    profileId,
    extraInstruction,
    input: {
      post,
      // The posts nearest the target matter most, so a long thread keeps its end.
      thread: thread.slice(-MAX_THREAD_POSTS),
      quoted: parsePost(b.quoted),
      isOwnPost: typeof b.isOwnPost === "boolean" ? b.isOwnPost : null,
    },
  }
}
