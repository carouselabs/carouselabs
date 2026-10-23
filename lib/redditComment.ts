// lib/redditComment.ts — reading and checking the body of CarouseLabs Engage
// for Reddit's comment request (app/api/ext/reddit/comment). Everything in it
// was read from reddit.com, so it is capped and cleaned before it goes near a
// prompt.
import type {
  RedditCommentInput,
  RedditItemInput,
  RedditPostInput,
  RedditRuleInput,
} from "@/lib/ai/prompts/redditCommentPrompt"

// Caps on what arrives from a page: enough for any real post and thread,
// small enough that one request can't carry a huge prompt.
const MAX_TITLE_CHARS = 300
const MAX_POST_CHARS = 6000
const MAX_COMMENT_CHARS = 3000
const MAX_OTHER_CHARS = 600
const MAX_CHAIN = 8
const MAX_OTHERS = 5
const MAX_RULES = 15
const MAX_RULE_TITLE_CHARS = 120
const MAX_RULE_TEXT_CHARS = 500
const POST_KINDS = new Set(["text", "link", "image", "video", "gallery", "poll", "crosspost", "multi_media"])

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "")

// "r/startups" (Reddit names are 2–21 letters, digits or underscores), or "".
export function subredditName(value: unknown): string {
  const name = str(value, 30).replace(/^\/?r\//i, "")
  return /^[A-Za-z0-9_]{2,21}$/.test(name) ? `r/${name}` : ""
}

// A Reddit username without "u/", or "" (deleted, or not a username).
function username(value: unknown): string {
  const name = str(value, 30).replace(/^\/?u\//i, "")
  return /^[A-Za-z0-9_-]{3,20}$/.test(name) ? name : ""
}

// A post's or comment's own reddit.com address, or "" (the History screens
// make it a link, so nothing else may get through).
export function redditUrl(value: unknown): string {
  if (typeof value !== "string") return ""
  try {
    const url = new URL(value.trim().slice(0, 500), "https://www.reddit.com")
    if (url.protocol !== "https:" || url.hostname !== "www.reddit.com") return ""
    // /r/<sub>/comments/<post>/<slug>/ for a post; a comment adds
    // /comment/<id>/ (or, in older links, /<slug>/<id>/).
    if (!/^\/r\/[A-Za-z0-9_]{2,21}\/comments\/[a-z0-9]{1,16}(?:\/[^/?#]+)?(?:\/(?:comment\/)?[a-z0-9]{1,16})?\/?$/.test(url.pathname)) {
      return ""
    }
    return `https://www.reddit.com${url.pathname}`
  } catch {
    return ""
  }
}

function parseItem(raw: unknown, max: number): RedditItemInput | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const text = str(r.text, max)
  return text ? { author: username(r.author), text, url: redditUrl(r.url) } : null
}

function parsePost(raw: unknown): RedditPostInput | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const title = str(r.title, MAX_TITLE_CHARS)
  if (!title) return null
  const kind = str(r.kind, 20).toLowerCase()
  return {
    title,
    author: username(r.author),
    text: str(r.text, MAX_POST_CHARS),
    url: redditUrl(r.url),
    flair: str(r.flair, 60),
    kind: POST_KINDS.has(kind) ? kind : "text",
  }
}

function parseRules(raw: unknown): RedditRuleInput[] {
  if (!Array.isArray(raw)) return []
  return raw
    .slice(0, MAX_RULES)
    .map((r) => {
      const rule = (r && typeof r === "object" ? r : {}) as Record<string, unknown>
      return { title: str(rule.title, MAX_RULE_TITLE_CHARS), text: str(rule.text, MAX_RULE_TEXT_CHARS) }
    })
    .filter((rule) => rule.title !== "")
}

const items = (raw: unknown, max: number): RedditItemInput[] =>
  Array.isArray(raw) ? raw.map((item) => parseItem(item, max)).filter((item): item is RedditItemInput => item !== null) : []

// The request body, or an error message for a 400.
export function parseRedditCommentBody(body: unknown):
  | { ok: true; profileId: string; input: RedditCommentInput; extraInstruction?: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body" }
  const b = body as Record<string, unknown>
  const profileId = typeof b.profileId === "string" ? b.profileId : ""
  if (!profileId) return { ok: false, error: "Missing profileId" }

  const post = parsePost(b.post)
  const subreddit = subredditName(b.subreddit)
  if (!post || !subreddit) {
    return { ok: false, error: "No post was captured. Click Reply on the post or comment again, then retry." }
  }

  // A reply names the comment it answers; without one, it's a comment on the post.
  const replyTo = b.replyTo == null ? null : parseItem(b.replyTo, MAX_COMMENT_CHARS)
  if (b.replyTo != null && !replyTo) {
    return { ok: false, error: "The comment you're replying to has no text. Click Reply on it again, then retry." }
  }
  const extraInstruction =
    typeof b.extraInstruction === "string" && b.extraInstruction.trim() ? b.extraInstruction.trim().slice(0, 500) : undefined

  return {
    ok: true,
    profileId,
    extraInstruction,
    input: {
      subreddit,
      rules: parseRules(b.rules),
      post,
      replyTo,
      // The comments nearest the one being answered matter most, so a long
      // thread keeps its end.
      chain: replyTo ? items(b.chain, MAX_COMMENT_CHARS).slice(-MAX_CHAIN) : [],
      others: replyTo ? [] : items(b.others, MAX_OTHER_CHARS).slice(0, MAX_OTHERS),
      isOwnPost: typeof b.isOwnPost === "boolean" ? b.isOwnPost : null,
    },
  }
}
