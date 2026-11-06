// lib/ai/postEmailAi.ts — AI help for shared-post emails (lib/postEmail.ts):
//   - readPostScreenshot: copies what a screenshot of a LinkedIn post shows
//     (who posted it, their headline, the text, likes, comments, the poll,
//     the top comment...) and where its pictures are, so they can be cut out.
//     LinkedIn can't be read from a link, so a screenshot is the way in.
//   - writePostEmailWords: the admin's words around the post (subject,
//     preview line, intro, outro, button), for what the email is for.
// The post's own words are never rewritten: they're copied as shown.
import Anthropic from "@anthropic-ai/sdk"
import { parseJsonObject } from "@/lib/ai/jsonAnswer"
import { invalidVariables, isAllowedLink } from "@/lib/emailDesign"
import { ENGAGE_URL, POST_TYPES, type PostEmail, type PostType } from "@/lib/postEmail"

// The most capable model, as for the email writer: reading small print off
// a screenshot exactly, and writing words that sound like a person.
export const POST_EMAIL_MODEL = "claude-opus-5-5"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 100_000, maxRetries: 1 })

export class PostEmailAiError extends Error {}

const TYPE_IDS = new Set<string>(POST_TYPES.map((t) => t.id))
type Box = [number, number, number, number]

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const keepLines = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").replace(/^\s+|\s+$/g, "").slice(0, max) : "")
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const num = (v: unknown, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0
}
function box(v: unknown): Box | null {
  if (!Array.isArray(v) || v.length !== 4 || !v.every((n) => typeof n === "number" && Number.isFinite(n))) return null
  const [x0, y0, x1, y1] = (v as number[]).map((n) => Math.min(1, Math.max(0, n)))
  return x1 - x0 > 0.01 && y1 - y0 > 0.01 ? [x0, y0, x1, y1] : null
}

/** What a screenshot showed: every field optional (empty when it wasn't visible). */
export type ScreenshotRead = {
  type: PostType
  author: { name: string; bio: string; followers: string; time: string }
  caption: string
  // The screenshot cuts the text at "…more": the rest isn't in it.
  captionCut: boolean
  counts: { reactions: string; comments: string; reposts: string }
  photosTotal: number
  slides: { title: string; pages: number }
  videoDuration: string
  poll: { question: string; options: { label: string; percent: number }[]; votes: string; timeLeft: string }
  article: { title: string; source: string; readTime: string; blurb: string }
  link: { title: string; domain: string }
  repost: { name: string; bio: string; time: string; text: string }
  event: { title: string; date: string; when: string; place: string; attendees: string }
  topComment: { name: string; bio: string; text: string; likes: string } | null
  // Where its pictures are, as fractions of the screenshot's width and height.
  boxes: { authorPhoto: Box | null; media: Box | null; commentPhoto: Box | null; repostPhoto: Box | null }
}

const READ_PROMPT = `You read a screenshot of a LinkedIn post and copy what it shows into JSON, for an email that shares the post.

Copy words exactly as they appear: same spelling, capitals, emoji, punctuation and line breaks (use \\n; a blank line is \\n\\n). Never fix, shorten, translate or add anything. If something isn't visible, leave it empty ("" or 0 or null). Don't guess numbers.

Answer with this JSON only:
{
  "type": one of ${[...TYPE_IDS].map((t) => `"${t}"`).join(", ")} ("slideshow" = a document or carousel post with pages; "photos" = several photos; "repost" = someone sharing another person's post with their own words above it),
  "author": { "name": "", "bio": "their headline under the name", "followers": "just the number as shown, e.g. 18,402 (only if the screenshot shows followers)", "time": "as shown, e.g. 2d or 1w (without the globe or 'Edited')" },
  "caption": "the post's text, every line",
  "captionCut": true if the text ends in "…more" / "...see more" (so the rest is missing), else false,
  "counts": { "reactions": "the number beside the reaction icons, e.g. 2,318 (if it says 'Name and 2,317 others', give 2,318)", "comments": "number only", "reposts": "number only" },
  "photosTotal": how many photos the post has if it shows "+N" (shown photos + N), else 0,
  "slides": { "title": "the document's title if shown", "pages": number of pages if shown (e.g. from '1 / 8' or '8 pages'), else 0 },
  "videoDuration": "e.g. 1:42 if shown",
  "poll": { "question": "", "options": [{ "label": "", "percent": number or 0 }], "votes": "number only", "timeLeft": "e.g. 3 days left" },
  "article": { "title": "", "source": "newsletter or site name", "readTime": "e.g. 6 min read", "blurb": "the line under the title if shown" },
  "link": { "title": "the shared link's title", "domain": "e.g. example.com" },
  "repost": { "name": "the original post's author", "bio": "", "time": "", "text": "the original post's text, every visible line" },
  "event": { "title": "", "date": "YYYY-MM-DD only if the full date is visible, else \\"\\"", "when": "e.g. Thu, 6:00 PM IST", "place": "e.g. Online", "attendees": "number only" },
  "topComment": null, or the first comment shown: { "name": "", "bio": "", "text": "", "likes": "number only" },
  "boxes": {
    "authorPhoto": [left, top, right, bottom] of the post author's round profile photo, as fractions 0-1 of the screenshot's width and height, or null,
    "media": the post's main picture, video or first slide (the picture area only, no text or buttons), or null,
    "commentPhoto": the top comment author's photo, or null,
    "repostPhoto": the original post author's photo inside a repost, or null
  }
}
Make each box tight around the picture itself.`

/** Reads a screenshot of a LinkedIn post (a JPEG or PNG, base64). */
export async function readPostScreenshot(image: { base64: string; mediaType: "image/jpeg" | "image/png" }): Promise<ScreenshotRead> {
  const response = await anthropic.messages.create({
    model: POST_EMAIL_MODEL,
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: READ_PROMPT },
        ],
      },
    ],
  })
  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
  const parsed = parseJsonObject(raw)
  if (!parsed) throw new PostEmailAiError("Couldn't read that screenshot. Try a clearer one, showing the whole post.")
  return normalizeRead(parsed)
}

/** The model's answer, every field checked and cut to size. */
export function normalizeRead(p: Record<string, unknown>): ScreenshotRead {
  const author = obj(p.author)
  const counts = obj(p.counts)
  const slides = obj(p.slides)
  const poll = obj(p.poll)
  const article = obj(p.article)
  const link = obj(p.link)
  const repost = obj(p.repost)
  const event = obj(p.event)
  const boxes = obj(p.boxes)
  const comment = p.topComment && typeof p.topComment === "object" ? obj(p.topComment) : null
  const date = str(event.date, 10)
  return {
    type: typeof p.type === "string" && TYPE_IDS.has(p.type) ? (p.type as PostType) : "text",
    author: { name: str(author.name, 80), bio: str(author.bio, 220), followers: str(author.followers, 40), time: str(author.time, 30) },
    caption: keepLines(p.caption, 3000),
    captionCut: p.captionCut === true,
    counts: { reactions: str(counts.reactions, 20), comments: str(counts.comments, 20), reposts: str(counts.reposts, 20) },
    photosTotal: Math.round(num(p.photosTotal, 99)),
    slides: { title: str(slides.title, 120), pages: Math.round(num(slides.pages, 999)) },
    videoDuration: str(p.videoDuration, 10),
    poll: {
      question: str(poll.question, 200),
      options: (Array.isArray(poll.options) ? poll.options : [])
        .slice(0, 4)
        .map((o) => ({ label: str(obj(o).label, 80), percent: num(obj(o).percent, 100) }))
        .filter((o) => o.label),
      votes: str(poll.votes, 30),
      timeLeft: str(poll.timeLeft, 40),
    },
    article: { title: str(article.title, 200), source: str(article.source, 100), readTime: str(article.readTime, 30), blurb: str(article.blurb, 400) },
    link: { title: str(link.title, 200), domain: str(link.domain, 100) },
    repost: { name: str(repost.name, 80), bio: str(repost.bio, 220), time: str(repost.time, 30), text: keepLines(repost.text, 3000) },
    event: {
      title: str(event.title, 200),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
      when: str(event.when, 80),
      place: str(event.place, 100),
      attendees: str(event.attendees, 40),
    },
    topComment: comment && str(comment.name, 80) && keepLines(comment.text, 1250)
      ? { name: str(comment.name, 80), bio: str(comment.bio, 160), text: keepLines(comment.text, 1250), likes: str(comment.likes, 20) }
      : null,
    boxes: { authorPhoto: box(boxes.authorPhoto), media: box(boxes.media), commentPhoto: box(boxes.commentPhoto), repostPhoto: box(boxes.repostPhoto) },
  }
}

// ── The admin's words around the post ───────────────────────────────────

export type PostEmailWords = Pick<PostEmail, "subject" | "preview" | "greeting" | "intro" | "outro" | "signoff"> & {
  button: PostEmail["button"]
}

const BUTTON_LINKS = [
  { url: ENGAGE_URL, what: "CarouseLabs Engage, the Chrome extension that helps you write thoughtful LinkedIn comments every day" },
  { url: "https://carouselabs.com", what: "CarouseLabs, the AI studio for LinkedIn posts, carousels and images" },
]

// Words that make writing sound machine-made.
const TELLS = [/—/, /\bdelve\b/i, /\bgame[- ]changer\b/i, /\bunlock\b/i, /\belevate\b/i, /\bin today's\b/i, /\btapestry\b/i, /\bseamless(ly)?\b/i, /\bharness\b/i, /\blevel up\b/i]

function wordsSystem(): string {
  return `You write the short email around a LinkedIn post that CarouseLabs shares with its users and leads. The post itself appears in the email as a LinkedIn-style card; you write only the words around it.

How it should sound: like a real person on a small team writing to people they know. Plain, warm, specific. Short sentences. No hype, no exclamation marks, no emoji, no em dashes, no "game-changer", "unlock", "elevate", "delve", "in today's world". Don't summarise the whole post (they can read it right below); say why it's worth their minute. Refer to the author by first name after the first mention. Never invent numbers or facts that aren't in the post.

Answer with this JSON only:
{
  "subject": "under 60 characters, specific, no clickbait, no emoji",
  "preview": "the line inboxes show after the subject, under 90 characters, adds something the subject doesn't",
  "greeting": "Hi {{firstName}},",
  "intro": "1 or 2 short paragraphs before the post (blank line between paragraphs)",
  "outro": "1 short paragraph after the post, or \\"\\"",
  "button": { "show": true or false, "label": "2 to 5 words", "url": one of ${BUTTON_LINKS.map((b) => `"${b.url}" (${b.what})`).join(", ")} },
  "signoff": "a short closing line, e.g. See you in the comments,"
}
{{firstName}} is the only merge field there is; use it only in the greeting. Show the button only when the admin's goal is to point people somewhere.`
}

// A short description of the post for the writer (no picture addresses).
function postSummary(email: PostEmail): string {
  const p = email.post
  const parts = [
    `Kind of post: ${POST_TYPES.find((t) => t.id === p.type)?.label ?? p.type}`,
    `Author: ${p.author.name || "(not filled in)"}${p.author.bio ? `, ${p.author.bio}` : ""}${p.author.followers ? `, ${p.author.followers} followers` : ""}`,
    p.caption.trim() ? `Post text:\n"""\n${p.caption.trim().slice(0, 3000)}\n"""` : "",
    p.type === "poll" && p.poll.question ? `Poll: ${p.poll.question} (${p.poll.options.map((o) => `${o.label}${p.poll.showResults ? ` ${o.percent}%` : ""}`).join(", ")})` : "",
    p.type === "article" && p.article.title ? `Article: ${p.article.title}${p.article.source ? ` (${p.article.source})` : ""}` : "",
    p.type === "link" && p.link.title ? `Shared link: ${p.link.title} (${p.link.domain})` : "",
    p.type === "repost" && p.repost.author.name ? `Reposting ${p.repost.author.name}: "${p.repost.text.slice(0, 1500)}"` : "",
    p.type === "event" && p.event.title ? `Event: ${p.event.title}, ${p.event.date} ${p.event.when} ${p.event.place}` : "",
    p.type === "slideshow" ? `A document of ${Math.max(p.slides.pages, p.slides.items.length)} slides${p.slides.title ? `: ${p.slides.title}` : ""}` : "",
    p.type === "video" ? `A video${p.video.duration ? ` of ${p.video.duration}` : ""}` : "",
    [p.counts.reactions && `${p.counts.reactions} reactions`, p.counts.comments && `${p.counts.comments} comments`, p.counts.reposts && `${p.counts.reposts} reposts`].filter(Boolean).join(", "),
    p.topComment.show && p.topComment.text ? `Top comment by ${p.topComment.name}: "${p.topComment.text.slice(0, 500)}"` : "",
  ]
  return parts.filter(Boolean).join("\n")
}

function checkWords(raw: Record<string, unknown> | null): { words: PostEmailWords | null; problem: string } {
  if (!raw) return { words: null, problem: "That wasn't JSON." }
  const button = obj(raw.button)
  const words: PostEmailWords = {
    subject: str(raw.subject, 200),
    preview: str(raw.preview, 200),
    greeting: str(raw.greeting, 120) || "Hi {{firstName}},",
    intro: keepLines(raw.intro, 3000),
    outro: keepLines(raw.outro, 3000),
    signoff: str(raw.signoff, 200),
    button: { show: button.show === true, label: str(button.label, 60), url: str(button.url, 500) },
  }
  if (!words.subject || !words.intro) return { words: null, problem: "The subject and intro are needed." }
  const all = [words.subject, words.preview, words.greeting, words.intro, words.outro, words.signoff, words.button.label].join("\n")
  if (invalidVariables(all).length || /\{\{\s*(?!firstName\b)\w+\s*\}\}/.test(all)) return { words: null, problem: "Use no merge field but {{firstName}}, and only in the greeting." }
  if (words.button.show && (!words.button.label || !BUTTON_LINKS.some((b) => b.url === words.button.url) || !isAllowedLink(words.button.url))) {
    return { words: null, problem: `The button's url must be one of: ${BUTTON_LINKS.map((b) => b.url).join(", ")}.` }
  }
  if (!words.button.show) words.button = { show: false, label: words.button.label || "Try CarouseLabs Engage", url: BUTTON_LINKS.some((b) => b.url === words.button.url) ? words.button.url : ENGAGE_URL }
  const tell = TELLS.find((t) => t.test(all))
  if (tell) return { words: null, problem: `Rewrite without "${all.match(tell)?.[0]}" (no em dashes or stock phrases).` }
  return { words, problem: "" }
}

/** The admin's words for this email, written for `goal` (what the email is for). */
export async function writePostEmailWords(input: { email: PostEmail; goal: string }): Promise<PostEmailWords> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `The post we're sharing:\n${postSummary(input.email)}\n\nWhat this email is for: ${input.goal.trim() || "share a post our readers will find useful"}\n\n${
        input.email.intro.trim() ? `The admin's current draft, keep what's good:\nSubject: ${input.email.subject}\nIntro: ${input.email.intro}\nOutro: ${input.email.outro}\n\n` : ""
      }Write the words.`,
    },
  ]
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await anthropic.messages.create({ model: POST_EMAIL_MODEL, max_tokens: 2000, system: wordsSystem(), messages })
    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
    const { words, problem } = checkWords(parseJsonObject(raw))
    if (words) return words
    messages.push({ role: "assistant", content: raw || "(no answer)" }, { role: "user", content: `${problem} Answer again with the complete JSON only.` })
  }
  throw new PostEmailAiError("The AI couldn't write usable words this time. Try again, or say what it's for differently.")
}

export const __test = { checkWords, postSummary }
