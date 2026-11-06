// The pictures a shared-post email makes on the server (lib/postEmailPictures.tsx)
// and the uploads it prepares (lib/postEmailUpload.ts): sizes, the 1 MB
// slideshow budget, that the same inputs make the same picture only once,
// and that only our own pictures are ever read. R2 is a map here.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"
import { beforeEach, describe, expect, it, vi } from "vitest"

const BASE = "https://media.test"
const stored = new Map<string, Buffer>()
vi.mock("@/lib/r2", () => ({
  uploadToR2: vi.fn(async (base64: string, file: string) => {
    stored.set(`${BASE}/${file}`, Buffer.from(base64, "base64"))
    return `${BASE}/${file}`
  }),
}))

process.env.CLOUDFLARE_R2_PUBLIC_URL = BASE
const { uploadToR2 } = await import("@/lib/r2")
const { buildPostPictures, finishPostEmail, isPostPicture, makeSlidesGif, PostEmailError, SLIDES_MAX_BYTES } = await import("@/lib/postEmailPictures")
const { preparePicture, savePostCrop, savePostPicture } = await import("@/lib/postEmailUpload")
const { newPostEmail, pictureKeys, currentBuilt, postEmailHtml } = await import("@/lib/postEmail")
type PostEmail = import("@/lib/postEmail").PostEmail

const look = (id: string) => readFileSync(path.join(process.cwd(), "public/images/looks", `${id}.jpg`))
// Set POST_PICS_OUT to a folder to look at what's made.
const OUT = process.env.POST_PICS_OUT
function keep(name: string, buf: Buffer) {
  if (!OUT) return
  mkdirSync(OUT, { recursive: true })
  writeFileSync(path.join(OUT, name), buf)
}

const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input)
  const buf = stored.get(url)
  if (!buf) return new Response("missing", { status: 404 })
  return new Response(init?.method === "HEAD" ? null : new Uint8Array(buf), { status: 200 })
})

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock)
})

async function up(id: string, kind: Parameters<typeof savePostPicture>[1]) {
  return savePostPicture(look(id), kind)
}

async function fullEmail(): Promise<PostEmail> {
  const e = newPostEmail("2026-11-06")
  e.subject = "The 10-minute habit"
  e.post.url = "https://www.linkedin.com/feed/update/urn:li:activity:1/"
  e.post.author.name = "Maya Rao"
  e.post.author.photo = await up("photo-bold-text", "photo")
  e.post.caption = "I stopped posting for 30 days. I only commented."
  return e
}

describe("uploads", () => {
  it("makes a square photo, a 4:1 banner and keeps a post picture's shape", async () => {
    const photo = await preparePicture(look("bauhaus"), "photo")
    expect([photo.width, photo.height, photo.type]).toEqual([400, 400, "image/jpeg"])
    const banner = await preparePicture(look("bauhaus"), "banner")
    expect([banner.width, banner.height]).toEqual([1584, 396])
    // 819×1024 stays as it is (under twice the card's width, under 3:2 tall).
    const media = await preparePicture(look("bauhaus"), "media")
    expect([media.width, media.height]).toEqual([819, 1024])
  })

  it("cuts a very tall picture at 3:2, keeping its top", async () => {
    const tall = await sharp({ create: { width: 600, height: 2400, channels: 3, background: "#336699" } }).png().toBuffer()
    const media = await preparePicture(tall, "media")
    expect([media.width, media.height]).toEqual([600, 900])
  })

  it("keeps a GIF moving, at the card's width", async () => {
    const frames = await Promise.all(["#ff0000", "#00ff00", "#0000ff"].map((c) => sharp({ create: { width: 800, height: 600, channels: 3, background: c } }).png().toBuffer()))
    const gif = await sharp(frames, { join: { animated: true } }).gif({ delay: [200, 200, 200] }).toBuffer()
    const out = await preparePicture(gif, "gif")
    expect(out.type).toBe("image/gif")
    expect([out.width, out.height]).toEqual([558, 418])
    expect((await sharp(out.buf, { animated: true }).metadata()).pages).toBe(3)
  })

  it("refuses what isn't a picture, and files over 4 MB", async () => {
    await expect(preparePicture(Buffer.from("hello"), "media")).rejects.toBeInstanceOf(PostEmailError)
    await expect(savePostPicture(Buffer.alloc(4 * 1024 * 1024 + 1), "media")).rejects.toThrow(/over 4 MB/)
  })

  it("saves under email-post/up/ and cuts a box out of a screenshot", async () => {
    const pic = await up("bauhaus", "media")
    expect(pic.url).toMatch(/^https:\/\/media\.test\/email-post\/up\/[0-9a-f-]{36}\.jpg$/)
    expect(isPostPicture(pic.url)).toBe(true)
    const crop = await savePostCrop(look("bauhaus"), [0.1, 0.1, 0.4, 0.34], "photo")
    expect(crop).toMatchObject({ width: 400, height: 400 })
    expect(await savePostCrop(look("bauhaus"), [0.1, 0.1, 0.1, 0.1], "photo")).toBeNull()
  })
})

describe("made pictures", () => {
  it("makes the banner with the photo over it, from a colour or a real banner", async () => {
    const e = await fullEmail()
    const built = await buildPostPictures(e)
    expect(built.header).toMatchObject({ width: 1116, height: 236, key: pictureKeys(e).header })
    expect(built.header!.url).toMatch(/\/email-post\/built\/header-[0-9a-f]{32}-1116x236\.jpg$/)
    keep("header-colour.jpg", stored.get(built.header!.url)!)

    e.post.author.banner = { kind: "picture", color: "#A0C4E8", picture: await up("swiss-grid", "banner") }
    const withBanner = await buildPostPictures(e)
    expect(withBanner.header!.url).not.toBe(built.header!.url)
    keep("header-banner.jpg", stored.get(withBanner.header!.url)!)
  })

  it("makes a picture once: the same inputs find the saved one", async () => {
    const e = await fullEmail()
    const first = await buildPostPictures(e)
    const uploads = vi.mocked(uploadToR2).mock.calls.length
    const again = await buildPostPictures({ ...e, built: first })
    expect(again.header).toEqual(first.header)
    expect(vi.mocked(uploadToR2).mock.calls.length).toBe(uploads)
    // A changed photo makes a new one; the old one no longer counts as current.
    const changed = { ...e, post: { ...e.post, author: { ...e.post.author, photo: await up("bauhaus", "photo") } }, built: first }
    expect(currentBuilt(changed, "header")).toBeNull()
  })

  it("lays out 2 photos side by side and 3 as one big and two small, +N on the last", async () => {
    const e = await fullEmail()
    e.post.type = "photos"
    e.post.photos = { items: [await up("magazine-cover", "media"), await up("device-mockup", "media")], total: 2 }
    const two = await buildPostPictures(e)
    expect(two.grid).toMatchObject({ width: 1116, height: 558 })
    keep("grid-2.jpg", stored.get(two.grid!.url)!)
    e.post.photos = { items: [...e.post.photos.items, await up("photo-bold-text", "media")], total: 6 }
    const three = await buildPostPictures(e)
    expect(three.grid).toMatchObject({ width: 1116, height: 837 })
    keep("grid-3-plus-3.jpg", stored.get(three.grid!.url)!)
  })

  it("puts a play button and the length on a video's cover", async () => {
    const e = await fullEmail()
    e.post.type = "video"
    e.post.video = { cover: await up("movie-poster", "media"), duration: "1:42" }
    const built = await buildPostPictures(e)
    // 819×1024 is taller than 4:5, so it's shown at 4:5.
    expect(built.video).toMatchObject({ width: 1116, height: 1395 })
    keep("video.jpg", stored.get(built.video!.url)!)
  })

  it("turns slides into a moving picture under 1 MB that counts the pages", async () => {
    const slides = ["swiss-grid", "big-number", "quote-card", "one-color-bold", "whiteboard", "bauhaus", "blueprint", "magazine-cover"].map(look)
    const gif = await makeSlidesGif(slides, 12, 819 / 1024)
    expect(gif.buf.length).toBeLessThanOrEqual(SLIDES_MAX_BYTES)
    const meta = await sharp(gif.buf, { animated: true }).metadata()
    expect(meta.format).toBe("gif")
    expect(meta.pages).toBeGreaterThanOrEqual(4)
    expect([gif.width, gif.height]).toEqual([558, 698])
    expect(meta.delay?.[0]).toBe(2500)
    keep("slides.gif", gif.buf)
  }, 60_000)

  it("never reads a picture that isn't ours", async () => {
    const e = await fullEmail()
    e.post.author.photo = { url: "https://evil.example/x.jpg", width: 400, height: 400 }
    await expect(buildPostPictures(e)).rejects.toThrow(/isn't one of ours/)
    expect(fetchMock).not.toHaveBeenCalledWith("https://evil.example/x.jpg", expect.anything())
  })
})

describe("finishing an email", () => {
  it("says what's missing before anything is made", async () => {
    const e = newPostEmail("2026-11-06")
    await expect(finishPostEmail(e)).rejects.toThrow(/Write a subject\. Add the post's link\. Add the author's name\. Upload the author's photo/)
  })

  it("refuses a picture from elsewhere and a link that isn't LinkedIn", async () => {
    const e = await fullEmail()
    await expect(finishPostEmail({ ...e, post: { ...e.post, url: "https://example.com/post" } })).rejects.toThrow(/linkedin\.com/)
    await expect(finishPostEmail({ ...e, post: { ...e.post, image: { url: "https://evil.example/x.jpg", width: 10, height: 10 }, type: "image" } })).rejects.toThrow(/isn't one of ours/)
  })

  it("returns the email with its pictures made, its HTML and plain text", async () => {
    const e = await fullEmail()
    const done = await finishPostEmail(e)
    expect(done.email.built.header).toBeTruthy()
    expect(done.html).toContain(done.email.built.header!.url)
    expect(done.html).toBe(postEmailHtml(done.email))
    expect(done.text).toContain("I stopped posting for 30 days")
    keep("email.html", Buffer.from(done.html))
  })
})
