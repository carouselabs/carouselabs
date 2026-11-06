// lib/postEmail.ts — "Share a LinkedIn post" emails (Admin → Broadcasts →
// Share a post): any LinkedIn post shown the way LinkedIn shows it, inside a
// CarouseLabs email with the admin's own words around it. The author's
// banner and photo, their bio and followers, the post (every kind: text,
// pictures, slideshows, video, GIF, poll, article, link, repost, event), its
// likes and comments and a top comment. Every part of the card opens the post.
//
// The email is kept as data (PostEmail) and turned into HTML here. Pictures
// that inboxes can't build themselves (the banner with the photo over it, a
// photo grid, a video cover with its play button, a slideshow as a moving
// picture) are made on the server (lib/postEmailPictures.tsx) and named in
// `built`; until they are, a simpler stand-in shows. A campaign keeps the
// finished HTML (PostDesign in EmailCampaign.design) and is sent like a
// ready-made email (lib/readyEmailSend.ts): tracked, a lead's copy with its
// Unsubscribe link.
// No server-only imports: the admin's page renders its preview with this too.
import { z } from "zod"
import { APP_URL, EMAIL_COLORS as C, EMAIL_IMAGES, SANS, SERIF } from "@/emails/theme"
import { invalidVariables, isAllowedLink } from "@/lib/emailDesign"
import { readyDesignOf, type ReadyDesign } from "@/lib/readyEmails"

// ── What a post email is ────────────────────────────────────────────────

export const POST_TYPES = [
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "photos", label: "Several photos" },
  { id: "slideshow", label: "Slideshow" },
  { id: "video", label: "Video" },
  { id: "gif", label: "GIF" },
  { id: "poll", label: "Poll" },
  { id: "article", label: "Article" },
  { id: "link", label: "Link preview" },
  { id: "repost", label: "Repost" },
  { id: "event", label: "Event" },
] as const
export type PostType = (typeof POST_TYPES)[number]["id"]
const TYPE_IDS = POST_TYPES.map((t) => t.id) as [PostType, ...PostType[]]

// A post's link: LinkedIn itself, so every click lands on the real post.
export function isLinkedInUrl(href: string): boolean {
  try {
    const url = new URL(href)
    return url.protocol === "https:" && (url.hostname === "linkedin.com" || url.hostname === "www.linkedin.com")
  } catch {
    return false
  }
}

// The admin's own words: merge fields must be real ones.
const words = (max: number) =>
  z
    .string()
    .max(max)
    .refine((t) => invalidVariables(t).length === 0, { message: "Uses a merge field that doesn't exist" })
// Words copied from the post: kept as written (braces included, shown as text).
const line = (max: number) => z.string().trim().max(max)
const text = (max: number) => z.string().max(max)

export const pictureSchema = z.object({
  url: z.string().trim().max(600).regex(/^https:\/\/\S+$/, "A picture must be an https address"),
  width: z.number().int().min(1).max(8000),
  height: z.number().int().min(1).max(8000),
})
export type Picture = z.infer<typeof pictureSchema>

const personSchema = z.object({
  name: line(80),
  bio: line(220),
  photo: pictureSchema.nullable(),
})

// A picture made on the server, with what it was made from (pictureKeys):
// shown only while that still matches.
const builtSchema = pictureSchema.extend({ key: z.string().max(4000) })

export const postEmailSchema = z.object({
  version: z.literal(1),
  // The email around the post.
  subject: words(200),
  preview: words(200),
  // Who it's from: this name, at the campaign's address.
  fromName: z
    .string()
    .trim()
    .min(1, "Say who it's from")
    .max(80)
    .regex(/^[^<>"@,;\r\n]+$/, "The sender's name can't have < > \" @ , or ;"),
  greeting: words(120),
  intro: words(3000),
  outro: words(3000),
  button: z.object({
    show: z.boolean(),
    label: words(60),
    url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || isAllowedLink(v), { message: "The button can only go to carouselabs.com, the Chrome Web Store listings, LinkedIn or X" }),
  }),
  signoff: words(200),
  signature: words(80),
  post: z.object({
    type: z.enum(TYPE_IDS),
    url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || isLinkedInUrl(v), { message: "The post's link must be a linkedin.com address" }),
    author: personSchema.extend({
      followers: line(40),
      time: line(30),
      follow: z.boolean(),
      // The band over the photo: a colour, or their real LinkedIn banner.
      banner: z.object({
        kind: z.enum(["color", "picture"]),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
        picture: pictureSchema.nullable(),
      }),
    }),
    caption: text(3000),
    // The whole caption, or its first lines and "…see more" (like the feed).
    captionMode: z.enum(["full", "short"]),
    image: pictureSchema.nullable(),
    photos: z.object({ items: z.array(pictureSchema).max(3), total: z.number().int().min(0).max(99) }),
    slides: z.object({ items: z.array(pictureSchema).max(20), pages: z.number().int().min(0).max(999), title: line(120) }),
    video: z.object({ cover: pictureSchema.nullable(), duration: line(10) }),
    gif: pictureSchema.nullable(),
    poll: z.object({
      question: line(200),
      options: z.array(z.object({ label: line(80), percent: z.number().min(0).max(100) })).max(4),
      votes: line(30),
      timeLeft: line(40),
      showResults: z.boolean(),
    }),
    article: z.object({ cover: pictureSchema.nullable(), title: line(200), source: line(100), readTime: line(30), blurb: line(400) }),
    link: z.object({ picture: pictureSchema.nullable(), title: line(200), domain: line(100) }),
    repost: z.object({ author: personSchema, time: line(30), text: text(3000), picture: pictureSchema.nullable() }),
    event: z.object({
      cover: pictureSchema.nullable(),
      title: line(200),
      date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick the event's date"),
      when: line(80),
      place: line(100),
      attendees: line(40),
    }),
    counts: z.object({ reactions: line(20), comments: line(20), reposts: line(20) }),
    topComment: z.object({
      show: z.boolean(),
      name: line(80),
      bio: line(160),
      photo: pictureSchema.nullable(),
      text: text(1250),
      likes: line(20),
    }),
    // The button under the post; empty = the usual one for its kind.
    viewLabel: line(60),
    // The day the numbers were copied: "numbers as of 6 Nov 2026".
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Say when the numbers were copied"),
  }),
  built: z
    .object({ header: builtSchema.optional(), grid: builtSchema.optional(), video: builtSchema.optional(), slides: builtSchema.optional() })
    .default({}),
})
export type PostEmail = z.infer<typeof postEmailSchema>
export type PostEmailInput = z.input<typeof postEmailSchema>
export type BuiltPicture = z.infer<typeof builtSchema>
export type BuiltKind = "header" | "grid" | "video" | "slides"

export const ENGAGE_URL = "https://carouselabs.com/#extension"
export const DEFAULT_BANNER = "#A0C4E8"
export const BANNER_COLORS = ["#A0C4E8", "#B9D7C5", "#F2C9A0", "#D9C2EC", "#F4B6C2", "#C9CED6", "#211F1C", "#0A66C2"]

/** A new, empty post email: the admin fills in the post and the words. */
export function newPostEmail(today: string): PostEmail {
  return {
    version: 1,
    subject: "",
    preview: "",
    fromName: "CarouseLabs",
    greeting: "Hi {{firstName}},",
    intro: "",
    outro: "",
    button: { show: false, label: "Try CarouseLabs Engage", url: ENGAGE_URL },
    signoff: "See you in the comments,",
    signature: "The CarouseLabs Team",
    post: {
      type: "text",
      url: "",
      author: { name: "", bio: "", photo: null, followers: "", time: "", follow: true, banner: { kind: "color", color: DEFAULT_BANNER, picture: null } },
      caption: "",
      captionMode: "full",
      image: null,
      photos: { items: [], total: 0 },
      slides: { items: [], pages: 0, title: "" },
      video: { cover: null, duration: "" },
      gif: null,
      poll: { question: "", options: [], votes: "", timeLeft: "", showResults: true },
      article: { cover: null, title: "", source: "", readTime: "", blurb: "" },
      link: { picture: null, title: "", domain: "" },
      repost: { author: { name: "", bio: "", photo: null }, time: "", text: "", picture: null },
      event: { cover: null, title: "", date: "", when: "", place: "", attendees: "" },
      counts: { reactions: "", comments: "", reposts: "" },
      topComment: { show: false, name: "", bio: "", photo: null, text: "", likes: "" },
      viewLabel: "",
      asOf: today,
    },
    built: {},
  }
}

// ── Pictures made on the server ─────────────────────────────────────────

const SHOWN_PHOTOS = 3
const SLIDES_IN_GIF = 10

/**
 * What each server-made picture is made from, as a key: the same key means
 * the same picture (lib/postEmailPictures.tsx names its file by it). null
 * when this email doesn't need that picture.
 */
export function pictureKeys(email: PostEmail): Record<BuiltKind, string | null> {
  const p = email.post
  const a = p.author
  return {
    header: a.photo ? JSON.stringify(["header", 1, a.photo.url, a.banner.kind === "picture" && a.banner.picture ? a.banner.picture.url : a.banner.color]) : null,
    grid:
      p.type === "photos" && p.photos.items.length >= 2
        ? JSON.stringify(["grid", 1, p.photos.items.map((i) => i.url), morePhotos(email)])
        : null,
    video: p.type === "video" && p.video.cover ? JSON.stringify(["video", 1, p.video.cover.url, p.video.duration]) : null,
    slides:
      p.type === "slideshow" && p.slides.items.length >= 2
        ? JSON.stringify(["slides", 1, p.slides.items.slice(0, SLIDES_IN_GIF).map((i) => i.url), slidePages(email)])
        : null,
  }
}

/** A built picture, only while it still matches what it was made from. */
export function currentBuilt(email: PostEmail, kind: BuiltKind): BuiltPicture | null {
  const key = pictureKeys(email)[kind]
  const built = email.built[kind]
  return key && built && built.key === key ? built : null
}

/** "+3" on the last photo: how many more the post has than the email shows. */
export function morePhotos(email: PostEmail): number {
  const shown = Math.min(SHOWN_PHOTOS, email.post.photos.items.length)
  return Math.max(0, email.post.photos.total - shown)
}

/** How many pages the document has (at least the slides given). */
export function slidePages(email: PostEmail): number {
  return Math.max(email.post.slides.pages, email.post.slides.items.length)
}

export const SLIDES_SHOWN = SLIDES_IN_GIF

// ── What still needs filling in ─────────────────────────────────────────

/** What's missing before it can be sent, in plain words (empty when ready). */
export function postEmailProblems(email: PostEmail): string[] {
  const p = email.post
  const out: string[] = []
  if (!email.subject.trim()) out.push("Write a subject")
  if (!p.url) out.push("Add the post's link")
  if (!p.author.name) out.push("Add the author's name")
  if (!p.author.photo) out.push("Upload the author's photo")
  if (p.author.banner.kind === "picture" && !p.author.banner.picture) out.push("Upload the banner, or use a colour")
  const need: Partial<Record<PostType, () => string | null>> = {
    text: () => (p.caption.trim() ? null : "Add the post's text"),
    image: () => (p.image ? null : "Upload the post's image"),
    photos: () => (p.photos.items.length >= 2 ? null : "Upload at least 2 photos"),
    slideshow: () => (p.slides.items.length >= 2 ? null : "Upload at least 2 slides"),
    video: () => (p.video.cover ? null : "Upload the video's cover"),
    gif: () => (p.gif ? null : "Upload the GIF"),
    poll: () =>
      !p.poll.question ? "Add the poll's question" : p.poll.options.filter((o) => o.label).length < 2 ? "Add at least 2 poll options" : null,
    article: () => (p.article.title ? null : "Add the article's title"),
    link: () => (p.link.title && p.link.domain ? null : "Add the link's title and website"),
    repost: () =>
      !p.repost.author.name ? "Add the original post's author" : p.repost.text.trim() || p.repost.picture ? null : "Add the original post's text or picture",
    event: () => (!p.event.title ? "Add the event's name" : p.event.date ? null : "Pick the event's date"),
  }
  const missing = need[p.type]?.()
  if (missing) out.push(missing)
  if (p.topComment.show && (!p.topComment.name || !p.topComment.text.trim())) out.push("Add the top comment's name and words, or turn it off")
  if (email.button.show && (!email.button.label.trim() || !email.button.url)) out.push("Give the button its words and link, or turn it off")
  return out
}

/** Every picture the email points at (each must be one of ours to send). */
export function postPictureUrls(email: PostEmail): string[] {
  const p = email.post
  const pics = [
    p.author.photo,
    p.author.banner.picture,
    p.image,
    ...p.photos.items,
    ...p.slides.items,
    p.video.cover,
    p.gif,
    p.article.cover,
    p.link.picture,
    p.repost.author.photo,
    p.repost.picture,
    p.event.cover,
    p.topComment.photo,
    ...Object.values(email.built),
  ]
  return pics.flatMap((pic) => (pic ? [pic.url] : []))
}

// ── Turning it into HTML ────────────────────────────────────────────────

// LinkedIn's own colours, for the card.
const LI = { blue: "#0A66C2", ink: "#191919", sub: "#666666", line: "#E0DFDC", soft: "#F3F2EF", bubble: "#F2F2F2", bar: "#D6E6F7" }
// The card's width inside the email (its pictures are made at twice this).
export const CARD_WIDTH = 558

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
// Words from the post itself: their braces too, so nothing in them is taken
// for a merge field.
const postEsc = (s: string) => esc(s).replace(/\{/g, "&#123;").replace(/\}/g, "&#125;")

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-11-06" → "6 Nov 2026" (no time zones involved). */
export function dayLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}` : date
}

/** "18,402" → "18,402 followers"; words already saying it stay as they are. */
export function followersLine(followers: string): string {
  const f = followers.trim()
  return /^[\d.,\s]+[kKmM]?\+?$/.test(f) ? `${f} followers` : f
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

export const SHORT_CAPTION = { lines: 3, chars: 210 }

/** The feed's cut: the first 3 lines, at most ~210 characters, on a word. */
export function shortCaption(caption: string): { text: string; cut: boolean } {
  const all = caption.trim()
  let out = all.split("\n").slice(0, SHORT_CAPTION.lines).join("\n")
  if (out.length > SHORT_CAPTION.chars) {
    out = out.slice(0, SHORT_CAPTION.chars)
    const space = out.lastIndexOf(" ")
    if (space > SHORT_CAPTION.chars * 0.6) out = out.slice(0, space)
  }
  out = out.replace(/\s+$/, "")
  return out.length < all.length ? { text: out.replace(/[\s.,;:!?-]+$/, ""), cut: true } : { text: all, cut: false }
}

// A caption as LinkedIn shows it: line breaks kept, hashtags and links blue.
function captionHtml(caption: string): string {
  return postEsc(caption)
    .replace(/(^|[\s(])(#[\p{L}\p{N}_]+)/gu, `$1<span style="color:${LI.blue};font-weight:600">$2</span>`)
    .replace(/https?:\/\/[^\s<]+/g, (u) => `<span style="color:${LI.blue}">${u}</span>`)
    .replace(/\n/g, "<br>")
}

function captionBlock(caption: string, mode: "full" | "short", size = 14): string {
  if (!caption.trim()) return ""
  const shown = mode === "short" ? shortCaption(caption) : { text: caption.trim(), cut: false }
  const more = shown.cut ? `<span style="color:${LI.sub}">&hellip;see more</span>` : ""
  return `<p style="margin:0;font-size:${size}px;line-height:1.5;color:${LI.ink};word-break:break-word">${captionHtml(shown.text)}${more}</p>`
}

// The admin's words: a blank line starts a new paragraph.
function wordsHtml(words: string, style: string): string {
  return words
    .trim()
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p style="${style}">${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("\n")
}

const linked = (href: string, inner: string, extra = "") =>
  `<a href="${esc(href || APP_URL)}" target="_blank" style="display:block;text-decoration:none;color:${LI.ink};${extra}">${inner}</a>`

function img(pic: Picture, alt: string, width = CARD_WIDTH, extra = ""): string {
  const height = Math.round((width * pic.height) / pic.width)
  return `<img src="${esc(pic.url)}" width="${width}" height="${height}" alt="${postEsc(alt)}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;${extra}">`
}

function avatarHtml(person: { name: string; photo: Picture | null }, size: number, ring = false): string {
  const border = ring ? "border:3px solid #FFFFFF;" : ""
  if (person.photo) {
    return `<img src="${esc(person.photo.url)}" width="${size}" height="${size}" alt="${postEsc(person.name)}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;${border}object-fit:cover">`
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:50%;background-color:#7A8DA8;${border}color:#FFFFFF;font-family:${SANS};font-size:${Math.round(size * 0.36)}px;font-weight:700">${postEsc(initials(person.name))}</td></tr></table>`
}

// A picture that hasn't been uploaded yet (the admin's preview only).
function missingPicture(label: string, ratio = 0.62): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" height="${Math.round(CARD_WIDTH * ratio)}" style="background-color:${LI.soft};color:${LI.sub};font-family:${SANS};font-size:13px">${esc(label)}</td></tr></table>`
}

function mixWithWhite(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amount))
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

export type RenderOptions = { preview?: boolean }

// The author: their banner with the photo over it (one picture made on the
// server, since inboxes can't overlap things), then name, bio and followers.
function authorHtml(email: PostEmail, o: RenderOptions): string {
  const p = email.post
  const a = p.author
  const header = currentBuilt(email, "header")
  let top: string
  if (header) {
    top = linked(p.url, img(header, `${a.name}'s profile`, CARD_WIDTH, "border-radius:9px 9px 0 0"))
  } else {
    const band =
      a.banner.kind === "picture" && a.banner.picture
        ? `<td style="padding:0;border-radius:9px 9px 0 0;overflow:hidden">${img(a.banner.picture, "", CARD_WIDTH, "border-radius:9px 9px 0 0;height:76px;object-fit:cover")}</td>`
        : `<td height="76" style="height:76px;border-radius:9px 9px 0 0;background-color:${a.banner.color};background-image:linear-gradient(120deg,${a.banner.color},${mixWithWhite(a.banner.color, 0.45)})">&nbsp;</td>`
    const photo = a.photo || !o.preview ? avatarHtml(a, 64, true) : avatarHtml({ name: a.name || "?", photo: null }, 64, true)
    top = linked(p.url, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${band}</tr><tr><td style="padding:8px 14px 0">${photo}</td></tr></table>`)
  }
  const hint = (value: string, label: string) => (value ? postEsc(value) : o.preview ? `<span style="color:#B0ACA5">${label}</span>` : "")
  const meta = [a.followers ? followersLine(a.followers) : "", a.time].filter(Boolean).map(postEsc).join(" &middot; ")
  const follow = a.follow ? `<td align="right" valign="top" style="padding:2px 0 0 10px;white-space:nowrap;font-size:14px;font-weight:600;color:${LI.blue}">+ Follow</td>` : ""
  return `<tr><td style="padding:0">${top}</td></tr>
<tr><td style="padding:6px 14px 0">${linked(
    p.url,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top">
<p style="margin:0;font-size:16px;line-height:1.3;font-weight:700;color:${LI.ink}">${hint(a.name, "Author's name")}</p>
${a.bio || o.preview ? `<p style="margin:2px 0 0;font-size:13px;line-height:1.35;color:${LI.sub}">${hint(a.bio, "Their LinkedIn headline")}</p>` : ""}
${meta || o.preview ? `<p style="margin:2px 0 0;font-size:12px;line-height:1.35;color:${LI.sub}">${meta || hint("", "Followers · when posted")}</p>` : ""}
</td>${follow}</tr></table>`,
  )}</td></tr>`
}

// What's under the caption, by kind of post.
function mediaHtml(email: PostEmail, o: RenderOptions): string {
  const p = email.post
  const url = p.url
  const box = (inner: string, extra = "") => `<tr><td style="padding:0;${extra}">${linked(url, inner)}</td></tr>`
  const pad = (inner: string) => `<tr><td style="padding:0 14px 4px">${linked(url, inner)}</td></tr>`
  const need = (label: string, ratio?: number) => (o.preview ? box(missingPicture(label, ratio)) : "")
  switch (p.type) {
    case "text":
      return ""
    case "image":
      return p.image ? box(img(p.image, "The post's image")) : need("The post's image", 1)
    case "photos": {
      const grid = currentBuilt(email, "grid")
      if (grid) return box(img(grid, `${p.photos.total || p.photos.items.length} photos`))
      return p.photos.items[0] ? box(img(p.photos.items[0], "The post's first photo")) : need("The post's photos", 0.75)
    }
    case "slideshow": {
      const gif = currentBuilt(email, "slides")
      const first = p.slides.items[0]
      const pages = slidePages(email)
      const label = [p.slides.title, pages ? `${pages} pages` : ""].filter(Boolean).map(postEsc).join(" &middot; ")
      const strip = label ? `<tr><td style="padding:8px 14px;background-color:${LI.soft};font-size:12px;line-height:1.4;color:${LI.sub}">${linked(url, label, `color:${LI.sub}`)}</td></tr>` : ""
      if (gif) return box(img(gif, `Slideshow, ${pages} slides`)) + strip
      return first ? box(img(first, "Slide 1")) + strip : need("The slides", 1.25)
    }
    case "video": {
      const cover = currentBuilt(email, "video") ?? p.video.cover
      return cover ? box(img(cover, `Video${p.video.duration ? `, ${p.video.duration}` : ""}`)) : need("The video's cover", 0.56)
    }
    case "gif":
      return p.gif ? box(img(p.gif, "Animated GIF")) : need("The GIF", 0.75)
    case "poll": {
      const options = p.poll.options.filter((opt) => opt.label)
      const top = Math.max(0, ...options.map((opt) => opt.percent))
      const rows = options
        .map((opt) =>
          p.poll.showResults
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;border:1px solid ${LI.line};border-radius:6px;border-collapse:separate"><tr><td style="padding:8px 12px;border-radius:6px;background-color:#FFFFFF;background-image:linear-gradient(90deg,${opt.percent === top ? "#C4DBF4" : LI.bar} ${opt.percent}%,#FFFFFF ${opt.percent}%)"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:14px;line-height:1.3;color:${LI.ink};font-weight:${opt.percent === top ? 700 : 400}">${postEsc(opt.label)}</td><td align="right" style="font-size:14px;font-weight:700;color:${LI.ink};padding-left:8px">${Math.round(opt.percent)}%</td></tr></table></td></tr></table>`
            : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px;border:1px solid ${LI.blue};border-radius:999px;border-collapse:separate"><tr><td align="center" style="padding:7px 12px;font-size:14px;font-weight:600;color:${LI.blue}">${postEsc(opt.label)}</td></tr></table>`,
        )
        .join("")
      const meta = [p.poll.votes ? `${postEsc(p.poll.votes)} votes` : "", postEsc(p.poll.timeLeft)].filter(Boolean).join(" &middot; ")
      return pad(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LI.line};border-radius:8px;border-collapse:separate"><tr><td style="padding:12px 12px 8px">
<p style="margin:0 0 10px;font-size:15px;line-height:1.35;font-weight:700;color:${LI.ink}">${postEsc(p.poll.question) || (o.preview ? `<span style="color:#B0ACA5">The poll's question</span>` : "")}</p>
${rows}${meta ? `<p style="margin:4px 0 0;font-size:12px;color:${LI.sub}">${meta}</p>` : ""}
</td></tr></table>`,
      )
    }
    case "article": {
      const a = p.article
      const meta = [a.source, a.readTime].filter(Boolean).map(postEsc).join(" &middot; ")
      return (
        (a.cover ? box(img(a.cover, "Article cover")) : "") +
        `<tr><td style="padding:12px 14px;background-color:${LI.soft}">${linked(
          url,
          `<p style="margin:0;font-size:16px;line-height:1.35;font-weight:700;color:${LI.ink}">${postEsc(a.title) || (o.preview ? `<span style="color:#B0ACA5">The article's title</span>` : "")}</p>
${meta ? `<p style="margin:4px 0 0;font-size:12px;color:${LI.sub}">${meta}</p>` : ""}
${a.blurb ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.45;color:${LI.ink}">${postEsc(a.blurb)}</p>` : ""}`,
        )}</td></tr>`
      )
    }
    case "link": {
      const l = p.link
      return (
        (l.picture ? box(img(l.picture, "Link preview")) : "") +
        `<tr><td style="padding:10px 14px;background-color:#EEF3F8">${linked(
          url,
          `<p style="margin:0;font-size:14px;line-height:1.35;font-weight:700;color:${LI.ink}">${postEsc(l.title) || (o.preview ? `<span style="color:#B0ACA5">The link's title</span>` : "")}</p>
<p style="margin:3px 0 0;font-size:12px;color:${LI.sub}">${postEsc(l.domain)}</p>`,
        )}</td></tr>`
      )
    }
    case "repost": {
      const r = p.repost
      const meta = [r.author.bio, r.time].filter(Boolean).map(postEsc).join(" &middot; ")
      return pad(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LI.line};border-radius:8px;border-collapse:separate"><tr><td style="padding:12px 12px ${r.picture ? "0" : "12px"}">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top" width="48" style="padding-right:8px">${avatarHtml(r.author, 40)}</td><td valign="top">
<p style="margin:0;font-size:14px;line-height:1.3;font-weight:700;color:${LI.ink}">${postEsc(r.author.name) || (o.preview ? `<span style="color:#B0ACA5">Original author</span>` : "")}</p>
${meta ? `<p style="margin:2px 0 0;font-size:12px;line-height:1.35;color:${LI.sub}">${meta}</p>` : ""}
</td></tr></table>
${r.text.trim() ? `<div style="padding-top:10px">${captionBlock(r.text, p.captionMode, 13)}</div>` : ""}
</td></tr>${r.picture ? `<tr><td style="padding:10px 0 0">${img(r.picture, "The original post's picture", CARD_WIDTH - 30, "border-radius:0 0 7px 7px")}</td></tr>` : ""}</table>`,
      )
    }
    case "event": {
      const e = p.event
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date)
      const tile = m
        ? `<td valign="top" width="60" style="padding-right:12px"><table role="presentation" width="52" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LI.line};border-radius:8px;border-collapse:separate"><tr><td align="center" style="padding:6px 0 0;font-size:11px;font-weight:700;letter-spacing:.04em;color:#B24020">${MONTHS[Number(m[2]) - 1]?.toUpperCase() ?? ""}</td></tr><tr><td align="center" style="padding:0 0 6px;font-size:22px;line-height:1.1;font-weight:700;color:${LI.ink}">${Number(m[3])}</td></tr></table></td>`
        : ""
      const lines = [e.when, e.place, e.attendees ? (/^[\d.,\s]+[kKmM]?\+?$/.test(e.attendees) ? `${e.attendees} attendees` : e.attendees) : ""]
        .filter(Boolean)
        .map((l) => `<p style="margin:3px 0 0;font-size:13px;line-height:1.35;color:${LI.sub}">${postEsc(l)}</p>`)
        .join("")
      return (
        (e.cover ? box(img(e.cover, "Event cover")) : "") +
        `<tr><td style="padding:12px 14px;background-color:${LI.soft}">${linked(
          url,
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${tile}<td valign="top">
<p style="margin:0;font-size:16px;line-height:1.3;font-weight:700;color:${LI.ink}">${postEsc(e.title) || (o.preview ? `<span style="color:#B0ACA5">The event's name</span>` : "")}</p>${lines}
</td></tr></table>`,
        )}</td></tr>`
      )
    }
  }
}

const REACTIONS = ["like", "celebrate", "love"]

function countsHtml(email: PostEmail): string {
  const c = email.post.counts
  const right = [c.comments ? `${postEsc(c.comments)} comments` : "", c.reposts ? `${postEsc(c.reposts)} reposts` : ""].filter(Boolean).join(" &middot; ")
  if (!c.reactions && !right) return ""
  const icons = REACTIONS.map(
    (r) => `<img src="${EMAIL_IMAGES}/post/${r}.png" width="16" height="16" alt="" style="display:inline-block;width:16px;height:16px;border:0;vertical-align:middle">`,
  ).join("")
  return `<tr><td style="padding:12px 14px 10px">${linked(
    email.post.url,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-size:12px;line-height:16px;color:${LI.sub};white-space:nowrap">${c.reactions ? `${icons}<span style="vertical-align:middle;padding-left:5px">${postEsc(c.reactions)}</span>` : ""}</td>
<td align="right" style="font-size:12px;line-height:16px;color:${LI.sub}">${right}</td>
</tr></table>`,
    `color:${LI.sub}`,
  )}</td></tr>`
}

/** The button under the post: its usual words for each kind of post. */
export function viewLabel(email: PostEmail): string {
  const p = email.post
  if (p.viewLabel.trim()) return p.viewLabel.trim()
  const pages = slidePages(email)
  const labels: Record<PostType, string> = {
    text: "View the post on LinkedIn",
    image: "View the post on LinkedIn",
    photos: p.photos.total > 1 ? `See all ${p.photos.total} photos on LinkedIn` : "See the photos on LinkedIn",
    slideshow: pages > 1 ? `See all ${pages} slides on LinkedIn` : "See the slides on LinkedIn",
    video: "Watch the video on LinkedIn",
    gif: "View the post on LinkedIn",
    poll: "Vote on LinkedIn",
    article: "Read the article on LinkedIn",
    link: "View the post on LinkedIn",
    repost: "View the post on LinkedIn",
    event: "See the event on LinkedIn",
  }
  return labels[p.type]
}

function topCommentHtml(email: PostEmail): string {
  const t = email.post.topComment
  if (!t.show || !t.name || !t.text.trim()) return ""
  return `<tr><td style="padding:0 14px 14px">${linked(
    email.post.url,
    `<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:${LI.sub}">Top comment</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" width="40" style="padding-right:8px">${avatarHtml(t, 32)}</td>
<td valign="top" style="padding:8px 12px;background-color:${LI.bubble};border-radius:0 8px 8px 8px">
<p style="margin:0;font-size:13px;line-height:1.3;font-weight:700;color:${LI.ink}">${postEsc(t.name)}</p>
${t.bio ? `<p style="margin:1px 0 0;font-size:12px;line-height:1.35;color:${LI.sub}">${postEsc(t.bio)}</p>` : ""}
<p style="margin:6px 0 0;font-size:13px;line-height:1.45;color:${LI.ink};word-break:break-word">${postEsc(t.text.trim()).replace(/\n/g, "<br>")}</p>
</td></tr>
${t.likes ? `<tr><td></td><td style="padding:4px 0 0 12px;font-size:12px;color:${LI.sub}">${postEsc(t.likes)} likes</td></tr>` : ""}
</table>`,
  )}</td></tr>`
}

/** The LinkedIn card on its own (what the email shares). */
export function postCardHtml(email: PostEmail, o: RenderOptions = {}): string {
  const p = email.post
  const caption = captionBlock(p.caption, p.captionMode)
  const captionRow = caption
    ? `<tr><td style="padding:12px 14px">${linked(p.url, caption)}</td></tr>`
    : o.preview && p.type === "text"
      ? `<tr><td style="padding:12px 14px;font-size:14px;color:#B0ACA5">The post's text</td></tr>`
      : `<tr><td style="height:10px;line-height:10px;font-size:0">&nbsp;</td></tr>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:${CARD_WIDTH + 2}px;border:1px solid ${LI.line};border-radius:10px;border-collapse:separate;background-color:#FFFFFF;font-family:${SANS}">
${authorHtml(email, o)}
${captionRow}
${mediaHtml(email, o)}
${countsHtml(email)}
<tr><td style="padding:0 14px"><div style="height:1px;line-height:1px;font-size:0;background-color:${LI.line}">&nbsp;</div></td></tr>
<tr><td style="padding:12px 14px 14px"><a href="${esc(p.url || APP_URL)}" target="_blank" style="display:inline-block;padding:8px 16px;border:1px solid ${LI.blue};border-radius:999px;font-size:14px;line-height:1.2;font-weight:600;color:${LI.blue};text-decoration:none">${postEsc(viewLabel(email))} &rarr;</a></td></tr>
${topCommentHtml(email)}
<tr><td style="padding:0 14px 12px;font-size:11px;line-height:1.4;color:#8C8C8C">Shared from LinkedIn &middot; numbers as of ${esc(dayLabel(p.asOf))}</td></tr>
</table>`
}

const BODY = `margin:0 0 16px;font-size:16px;line-height:1.65;color:${C.body}`

/** The whole email, with {{firstName}} (and any other merge field) still in it. */
export function postEmailHtml(email: PostEmail, o: RenderOptions = {}): string {
  const button =
    email.button.show && email.button.label.trim() && email.button.url
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px"><tr><td style="border-radius:10px;background-color:${C.ink}"><a href="${esc(email.button.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px">${esc(email.button.label.trim())}</a></td></tr></table>`
      : ""
  const signoff = email.signoff.trim() ? `<p style="${BODY};margin-bottom:6px">${esc(email.signoff.trim()).replace(/\n/g, "<br>")}</p>` : ""
  const signature = email.signature.trim()
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0"><tr><td style="vertical-align:middle"><img src="${EMAIL_IMAGES}/mark.png" width="24" height="24" alt="" style="display:block;border:0"></td><td style="vertical-align:middle;padding-left:10px;font-family:${SERIF};font-size:19px;color:${C.ink}">${esc(email.signature.trim())}</td></tr></table>`
    : ""
  const year = new Date().getFullYear()
  const foot = `margin:0 0 8px;font-size:12px;line-height:1.6;color:${C.muted}`
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(email.subject)}</title>
<style>@media (max-width:480px){ .px{padding-left:14px !important;padding-right:14px !important} .body{padding-left:14px !important;padding-right:14px !important} }</style>
</head>
<body style="margin:0;padding:32px 12px;background-color:${C.page};font-family:${SANS}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(email.preview)}${"&#847;&zwnj;&nbsp;".repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background-color:${C.card};border:1px solid ${C.line};border-radius:18px;border-collapse:separate">
<tr><td class="px" style="padding:24px 32px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle"><a href="${APP_URL}" style="text-decoration:none"><img src="${EMAIL_IMAGES}/logo.png" width="168" height="30" alt="CarouseLabs" style="display:block;border:0"></a></td>
<td align="right" style="vertical-align:middle"><a href="${APP_URL}" style="border:1px solid ${C.ink};border-radius:999px;padding:7px 15px;font-size:13px;font-weight:600;color:${C.ink};text-decoration:none;white-space:nowrap">Open CarouseLabs</a></td>
</tr></table>
</td></tr>
<tr><td class="body" style="padding:8px 40px 4px">
${email.greeting.trim() ? `<p style="${BODY}">${esc(email.greeting.trim())}</p>` : ""}
${wordsHtml(email.intro, BODY)}
<div style="margin:4px 0 22px">${postCardHtml(email, o)}</div>
${wordsHtml(email.outro, BODY)}
${button}
</td></tr>
<tr><td class="px" style="padding:12px 40px 34px">${signoff}${signature}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto"><tr><td class="px" align="center" style="padding:24px 32px 8px;font-family:${SANS}">
<p style="${foot}">CarouseLabs — your AI social media content studio.</p>
<p style="${foot}"><a href="${APP_URL}" style="color:${C.muted};text-decoration:underline">${APP_URL.replace(/^https?:\/\//, "")}</a> &middot; <a href="${APP_URL}/privacy" style="color:${C.muted};text-decoration:underline">Privacy</a> &middot; <a href="${APP_URL}/terms" style="color:${C.muted};text-decoration:underline">Terms</a></p>
<p style="${foot};margin:0">&copy; ${year} CarouseLabs</p>
</td></tr></table>
</body></html>`
}

/** The email in plain words: the campaign's text, for lists, search and plain-text inboxes. */
export function postEmailText(email: PostEmail): string {
  const p = email.post
  const caption = p.captionMode === "short" ? shortCaption(p.caption) : { text: p.caption.trim(), cut: false }
  const post = [
    `${p.author.name}${p.author.bio ? ` · ${p.author.bio}` : ""}`,
    caption.text ? `${caption.text}${caption.cut ? "…" : ""}` : "",
    p.type === "poll" ? [p.poll.question, ...p.poll.options.filter((o) => o.label).map((o) => `- ${o.label}`)].join("\n") : "",
    p.type === "article" || p.type === "link" ? (p.type === "article" ? p.article.title : p.link.title) : "",
    p.type === "event" ? [p.event.title, dayLabel(p.event.date), p.event.when, p.event.place].filter(Boolean).join(" · ") : "",
    `${viewLabel(email)}: ${p.url}`,
  ]
  return [
    email.greeting,
    email.intro.trim(),
    post.filter((s) => s.trim()).join("\n\n"),
    email.outro.trim(),
    email.button.show && email.button.url ? `${email.button.label}: ${email.button.url}` : "",
    [email.signoff, email.signature].filter((s) => s.trim()).join("\n"),
  ]
    .filter((s) => s.trim())
    .join("\n\n")
}

// ── What a campaign keeps ───────────────────────────────────────────────

export const postDesignSchema = z.object({
  kind: z.literal("post"),
  subject: z.string().min(1).max(300),
  fromName: z.string().min(1).max(100),
  html: z.string().min(1).max(200_000),
  // The email as data, to use again or edit.
  email: postEmailSchema,
})
export type PostDesign = z.infer<typeof postDesignSchema>

/** The copy a campaign (or template) keeps: the email as data and as it's sent. */
export function postSnapshot(email: PostEmail): PostDesign {
  return { kind: "post", subject: email.subject, fromName: email.fromName, html: postEmailHtml(email), email }
}

/** A campaign's (or template's) post email, or null for any other kind. */
export function postDesignOf(stored: unknown): PostDesign | null {
  if (!stored || typeof stored !== "object" || (stored as { kind?: unknown }).kind !== "post") return null
  const parsed = postDesignSchema.safeParse(stored)
  return parsed.success ? parsed.data : null
}

/** Sent the way a ready-made email is: its own HTML, from its own name. */
export function postAsReady(design: PostDesign): ReadyDesign {
  return { kind: "ready", id: "post", subject: design.subject, fromName: design.fromName, html: design.html }
}

/** A stored email that goes out as fixed HTML: a ready-made email or a shared post. */
export function fixedHtmlOf(stored: unknown): ReadyDesign | null {
  const ready = readyDesignOf(stored)
  if (ready) return ready
  const post = postDesignOf(stored)
  return post ? postAsReady(post) : null
}
