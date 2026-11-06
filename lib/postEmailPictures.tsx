// lib/postEmailPictures.tsx — the pictures a shared-post email (lib/postEmail.ts)
// needs that inboxes can't build from HTML (Gmail ignores negative margins and
// overlays; Outlook ignores most CSS):
//   - header: the author's banner (a colour or their real banner) with their
//     round photo over its edge, like a LinkedIn profile
//   - grid: several photos as LinkedIn lays them out, "+3" on the last
//   - video: the cover with a play button and the video's length
//   - slides: a document or carousel post as a moving picture (an animated
//     GIF, under 1 MB), "1 / 8" on each slide. Outlook on Windows shows only
//     the first frame, so slide 1 stands on its own.
// Each is named by what it's made from (pictureKeys), so the same inputs
// always give the same picture and it's only made once. Everything is saved
// to R2 under email-post/, the only pictures a post email may point at.
import { createHash } from "node:crypto"
import sharp from "sharp"
import { ImageResponse } from "next/og"
import { uploadToR2 } from "@/lib/r2"
import { EMAIL_COLORS } from "@/emails/theme"
import {
  CARD_WIDTH,
  SLIDES_SHOWN,
  morePhotos,
  pictureKeys,
  postEmailHtml,
  postEmailProblems,
  postEmailSchema,
  postEmailText,
  postPictureUrls,
  slidePages,
  type BuiltKind,
  type BuiltPicture,
  type PostEmail,
} from "@/lib/postEmail"

export const POST_FOLDER = "email-post"

export class PostEmailError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

const publicBase = () => process.env.CLOUDFLARE_R2_PUBLIC_URL ?? ""

/** True for a picture saved here (uploaded for a post email, or made for one). */
export function isPostPicture(url: string): boolean {
  const base = publicBase()
  return !!base && url.startsWith(`${base}/${POST_FOLDER}/`) && !url.includes("..")
}

const MAX_FETCH = 12 * 1024 * 1024

/** One of our pictures, read back from R2. */
export async function fetchPostPicture(url: string): Promise<Buffer> {
  if (!isPostPicture(url)) throw new PostEmailError("This email points at a picture that isn't one of ours. Upload it again.")
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new PostEmailError("A picture couldn't be read back from storage. Upload it again.", 502)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_FETCH) throw new PostEmailError("A picture is too big.")
  return buf
}

// Made pictures already saved (this server's memory; R2 is checked otherwise).
const known = new Set<string>()

async function alreadySaved(url: string): Promise<boolean> {
  if (known.has(url)) return true
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(6_000) })
    if (res.ok) known.add(url)
    return res.ok
  } catch {
    return false
  }
}

const dataUri = (buf: Buffer, type = "image/jpeg") => `data:${type};base64,${buf.toString("base64")}`

// A picture cut to exactly this size, for drawing.
const tile = (buf: Buffer, width: number, height: number) =>
  sharp(buf).rotate().resize(width, height, { fit: "cover", position: "attention" }).flatten({ background: "#FFFFFF" }).jpeg({ quality: 90 }).toBuffer()

async function draw(node: React.ReactElement, width: number, height: number): Promise<Buffer> {
  const image = new ImageResponse(node, { width, height })
  return Buffer.from(await image.arrayBuffer())
}

const toJpeg = (png: Buffer) => sharp(png).flatten({ background: "#FFFFFF" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer()

function lighter(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amount))
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`
}

// Everything is drawn at twice the card's width, for sharp phone screens;
// the slideshow at the card's width, to stay small enough to load quickly.
const W = CARD_WIDTH * 2

// ── header: banner + photo over its edge ────────────────────────────────

const BAND = 152
const RING = 156
const PHOTO = 144
const HEADER_H = 236

async function makeHeader(email: PostEmail): Promise<{ buf: Buffer; width: number; height: number }> {
  const a = email.post.author
  if (!a.photo) throw new PostEmailError("Upload the author's photo")
  const photo = await tile(await fetchPostPicture(a.photo.url), PHOTO * 2, PHOTO * 2)
  const bannerPic = a.banner.kind === "picture" && a.banner.picture ? await tile(await fetchPostPicture(a.banner.picture.url), W, BAND) : null
  const radius = 18
  const png = await draw(
    <div style={{ display: "flex", width: W, height: HEADER_H, backgroundColor: EMAIL_COLORS.card, position: "relative" }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: HEADER_H,
          backgroundColor: "#FFFFFF",
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
        }}
      />
      {bannerPic ? (
        // eslint-disable-next-line @next/next/no-img-element -- drawn to a picture, not a page
        <img
          src={dataUri(bannerPic)}
          width={W}
          height={BAND}
          alt=""
          style={{ position: "absolute", left: 0, top: 0, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            top: 0,
            width: W,
            height: BAND,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            backgroundImage: `linear-gradient(120deg, ${a.banner.color}, ${lighter(a.banner.color, 0.45)})`,
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 22,
          top: BAND - RING / 2,
          width: RING,
          height: RING,
          borderRadius: RING / 2,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn to a picture, not a page */}
        <img src={dataUri(photo)} width={PHOTO} height={PHOTO} alt="" style={{ borderRadius: PHOTO / 2 }} />
      </div>
    </div>,
    W,
    HEADER_H,
  )
  return { buf: await toJpeg(png), width: W, height: HEADER_H }
}

// ── grid: 2 photos side by side, 3 or more as one big and two small ─────

async function makeGrid(email: PostEmail): Promise<{ buf: Buffer; width: number; height: number }> {
  const items = email.post.photos.items.slice(0, 3)
  const more = morePhotos(email)
  const gap = 4
  const two = items.length === 2
  const height = two ? Math.round(W / 2) : Math.round((W * 3) / 4)
  const bigW = two ? (W - gap) / 2 : Math.round(((W - gap) * 2) / 3)
  const smallW = W - gap - bigW
  const smallH = two ? height : (height - gap) / 2
  const bufs = await Promise.all(items.map((i) => fetchPostPicture(i.url)))
  const tiles = await Promise.all(
    bufs.map((b, i) => (i === 0 ? tile(b, Math.floor(bigW), height) : tile(b, Math.floor(smallW), Math.floor(smallH)))),
  )
  const last = tiles.length - 1
  const png = await draw(
    <div style={{ display: "flex", width: W, height, backgroundColor: "#FFFFFF" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- drawn to a picture, not a page */}
      <img src={dataUri(tiles[0])} width={Math.floor(bigW)} height={height} alt="" />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: gap, width: Math.floor(smallW), height }}>
        {tiles.slice(1).map((t, i) => (
          <div key={i} style={{ display: "flex", position: "relative", marginTop: i > 0 ? gap : 0, width: Math.floor(smallW), height: Math.floor(smallH) }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn to a picture, not a page */}
            <img src={dataUri(t)} width={Math.floor(smallW)} height={Math.floor(smallH)} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
            {i + 1 === last && more > 0 && (
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: Math.floor(smallW),
                  height: Math.floor(smallH),
                  backgroundColor: "rgba(0,0,0,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: 76,
                  fontWeight: 700,
                }}
              >
                +{more}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    W,
    height,
  )
  return { buf: await toJpeg(png), width: W, height }
}

// ── video: cover, play button, length ───────────────────────────────────

const clampRatio = (w: number, h: number) => Math.min(16 / 9, Math.max(4 / 5, w / h))

async function makeVideo(email: PostEmail): Promise<{ buf: Buffer; width: number; height: number }> {
  const v = email.post.video
  if (!v.cover) throw new PostEmailError("Upload the video's cover")
  const height = Math.round(W / clampRatio(v.cover.width, v.cover.height))
  const cover = await tile(await fetchPostPicture(v.cover.url), W, height)
  const png = await draw(
    <div style={{ display: "flex", position: "relative", width: W, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- drawn to a picture, not a page */}
      <img src={dataUri(cover)} width={W} height={height} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: W / 2 - 66,
          top: height / 2 - 66,
          width: 132,
          height: 132,
          borderRadius: 66,
          backgroundColor: "rgba(0,0,0,0.6)",
          border: "5px solid rgba(255,255,255,0.9)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="46" height="54" viewBox="0 0 46 54" style={{ marginLeft: 10 }}>
          <path d="M0 0 L46 27 L0 54 Z" fill="#FFFFFF" />
        </svg>
      </div>
      {v.duration && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 24,
            bottom: 24,
            padding: "8px 18px",
            borderRadius: 12,
            backgroundColor: "rgba(0,0,0,0.72)",
            color: "#FFFFFF",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          {v.duration}
        </div>
      )}
    </div>,
    W,
    height,
  )
  return { buf: await toJpeg(png), width: W, height }
}

// ── slides: a moving picture, under 1 MB ────────────────────────────────

export const SLIDES_MAX_BYTES = 1024 * 1024
const SLIDE_MS = 2500

async function slideFrames(slides: Buffer[], pages: number, width: number, height: number): Promise<Buffer[]> {
  const frames: Buffer[] = []
  for (let i = 0; i < slides.length; i++) {
    const fitted = await sharp(slides[i])
      .rotate()
      .resize(width, height, { fit: "contain", background: "#FFFFFF" })
      .flatten({ background: "#FFFFFF" })
      .jpeg({ quality: 92 })
      .toBuffer()
    const png = await draw(
      <div style={{ display: "flex", position: "relative", width, height, backgroundColor: "#FFFFFF" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn to a picture, not a page */}
        <img src={dataUri(fitted)} width={width} height={height} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 12,
            top: 12,
            padding: "4px 11px",
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.66)",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {`${i + 1} / ${pages}`}
        </div>
      </div>,
      width,
      height,
    )
    frames.push(await sharp(png).removeAlpha().png().toBuffer())
  }
  return frames
}

const encodeGif = (frames: Buffer[], colours: number) =>
  sharp(frames, { join: { animated: true } })
    .gif({ colours, effort: 8, dither: 0.6, delay: frames.map(() => SLIDE_MS), loop: 0 })
    .toBuffer()

/**
 * The slides as an animated GIF of at most SLIDES_MAX_BYTES: fewer colours
 * first, then fewer slides (the counter still says how many there are).
 */
export async function makeSlidesGif(slides: Buffer[], pages: number, ratio: number): Promise<{ buf: Buffer; width: number; height: number }> {
  const width = CARD_WIDTH
  const height = Math.round(width / Math.min(16 / 9, Math.max(4 / 5, ratio)))
  const all = await slideFrames(slides.slice(0, SLIDES_SHOWN), Math.max(pages, slides.length), width, height)
  let smallest: Buffer | null = null
  for (const count of [all.length, 8, 6, 4].filter((n, i, list) => n <= all.length && list.indexOf(n) === i)) {
    for (const colours of [128, 64, 32]) {
      const gif = await encodeGif(all.slice(0, count), colours)
      if (!smallest || gif.length < smallest.length) smallest = gif
      if (gif.length <= SLIDES_MAX_BYTES) return { buf: gif, width, height }
    }
  }
  if (smallest && smallest.length <= SLIDES_MAX_BYTES * 1.5) return { buf: smallest, width, height }
  throw new PostEmailError("These slides are too detailed to fit in an email as a slideshow. Use fewer slides, or simpler ones.")
}

async function makeSlides(email: PostEmail) {
  const items = email.post.slides.items.slice(0, SLIDES_SHOWN)
  const bufs: Buffer[] = []
  for (const item of items) bufs.push(await fetchPostPicture(item.url))
  return makeSlidesGif(bufs, slidePages(email), items[0].width / items[0].height)
}

// ── making them all ─────────────────────────────────────────────────────

const MAKERS: Record<BuiltKind, { ext: "jpg" | "gif"; make: (email: PostEmail) => Promise<{ buf: Buffer; width: number; height: number }> }> = {
  header: { ext: "jpg", make: makeHeader },
  grid: { ext: "jpg", make: makeGrid },
  video: { ext: "jpg", make: makeVideo },
  slides: { ext: "gif", make: makeSlides },
}

const KIND_ORDER: BuiltKind[] = ["header", "grid", "video", "slides"]

// The made picture's size is in its name, so it's known without opening it.
function builtPath(kind: BuiltKind, key: string): string {
  return `${POST_FOLDER}/built/${kind}-${createHash("sha256").update(key).digest("hex").slice(0, 32)}`
}

/**
 * Makes (or finds, when made before) every picture this email needs and
 * returns them as `built`. Pictures it doesn't need are left out.
 */
export async function buildPostPictures(email: PostEmail): Promise<PostEmail["built"]> {
  const keys = pictureKeys(email)
  const built: PostEmail["built"] = {}
  for (const kind of KIND_ORDER) {
    const key = keys[kind]
    if (!key) continue
    const maker = MAKERS[kind]
    const path = builtPath(kind, key)
    const existing = email.built[kind]
    // A size the browser already knows for this exact picture is trusted
    // only when its address is the one this key makes.
    const base = publicBase()
    if (existing && existing.key === key && base && existing.url.startsWith(`${base}/${path}-`) && (await alreadySaved(existing.url))) {
      built[kind] = existing
      continue
    }
    const made = await maker.make(email)
    const file = `${path}-${made.width}x${made.height}.${maker.ext}`
    const url = await uploadToR2(made.buf.toString("base64"), file, maker.ext === "gif" ? "image/gif" : "image/jpeg")
    known.add(url)
    built[kind] = { url, width: made.width, height: made.height, key } satisfies BuiltPicture
  }
  return built
}

/** What's wrong with the email's pictures (null when they're all ours). */
export function postPicturesProblem(email: PostEmail): string | null {
  return postPictureUrls(email).some((u) => !isPostPicture(u)) ? "This email points at a picture that isn't one of ours. Upload it again." : null
}

/**
 * An email from the admin's page, checked and finished: everything filled
 * in, its pictures ours and made, and its HTML and plain text. Throws
 * PostEmailError saying what's missing.
 */
export async function finishPostEmail(raw: unknown): Promise<{ email: PostEmail; html: string; text: string }> {
  const parsed = postEmailSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new PostEmailError(issue ? `${issue.message}${issue.path.length ? ` (${issue.path.join(".")})` : ""}` : "This email can't be read")
  }
  const problems = postEmailProblems(parsed.data)
  if (problems.length) throw new PostEmailError(problems.join(". "))
  const pictures = postPicturesProblem(parsed.data)
  if (pictures) throw new PostEmailError(pictures)
  const email = { ...parsed.data, built: await buildPostPictures(parsed.data) }
  return { email, html: postEmailHtml(email), text: postEmailText(email) }
}
