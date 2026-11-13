// A post's pictures for the comment model (lib/engage/postImages.ts): only
// LinkedIn's image servers, at most six, only for a post of few words, a picture that fails is left out
// rather than failing the comment, and the model is told what it's looking at.
import { describe, expect, it, vi } from "vitest"
import { isPostImageUrl, loadPostImages, mediaNote, MAX_IMAGES, MEDIA_MAX_WORDS, postImageUrls, postWords, readsPostMedia } from "@/lib/engage/postImages"

const IMG = (n: number) => `https://media.licdn.com/dms/image/v2/X/feedshare-shrink_800/0/${n}?e=1&t=x`

describe("which addresses are used", () => {
  it("LinkedIn's image servers over https only", () => {
    expect(isPostImageUrl(IMG(1))).toBe(true)
    expect(isPostImageUrl("https://static.licdn.com/aero-v1/sc/h/x.png")).toBe(true)
    for (const bad of [
      "http://media.licdn.com/x.jpg",
      "https://media.licdn.com.evil.example/x.jpg",
      "https://evil.example/media.licdn.com/x.jpg",
      "https://127.0.0.1/x.jpg",
      "javascript:alert(1)",
      "",
      42,
      null,
      `https://media.licdn.com/${"a".repeat(3000)}`,
    ]) {
      expect(isPostImageUrl(bad), String(bad).slice(0, 40)).toBe(false)
    }
  })

  it("in order, without repeats, at most six, ignoring anything else in the list", () => {
    expect(postImageUrls(undefined)).toEqual([])
    expect(postImageUrls("not a list")).toEqual([])
    const urls = postImageUrls([IMG(1), IMG(1), "https://evil.example/x.jpg", IMG(2), IMG(3), IMG(4), IMG(5), IMG(6), IMG(7), 7])
    expect(urls).toEqual([IMG(1), IMG(2), IMG(3), IMG(4), IMG(5), IMG(6)])
    expect(urls).toHaveLength(MAX_IMAGES)
  })

  it("only for a post of fewer than 40 words", () => {
    expect(MEDIA_MAX_WORDS).toBe(40)
    expect(postWords("  one\ntwo   three ")).toBe(3)
    expect(readsPostMedia("")).toBe(true)
    expect(readsPostMedia("word ".repeat(39))).toBe(true)
    expect(readsPostMedia("word ".repeat(40))).toBe(false)
  })
})

describe("downloading them", () => {
  it("keeps the ones that arrive, as base64, and leaves the rest out", async () => {
    const fetchImage = vi.fn(async (url: string, opts?: { maxBytes?: number; timeoutMs?: number }) => {
      expect(opts?.maxBytes).toBeLessThanOrEqual(4 * 1024 * 1024)
      expect(opts?.timeoutMs).toBeLessThanOrEqual(1_500)
      if (url === IMG(2)) throw new Error("Timed out fetching that image")
      return { bytes: Buffer.from(`pic ${url.slice(-12)}`), mediaType: "image/jpeg" }
    })
    const images = await loadPostImages([IMG(1), IMG(2), IMG(3)], fetchImage as never)
    expect(fetchImage).toHaveBeenCalledTimes(3)
    expect(images).toHaveLength(2)
    expect(images[0]).toEqual({ mediaType: "image/jpeg", data: Buffer.from(`pic ${IMG(1).slice(-12)}`).toString("base64") })
  })

  it("nothing to download, nothing asked for", async () => {
    const fetchImage = vi.fn()
    expect(await loadPostImages([], fetchImage as never)).toEqual([])
    expect(fetchImage).not.toHaveBeenCalled()
  })
})

describe("what the model is told", () => {
  it("pictures: read them, respond to the post as a whole; a picture's numbers listed first", () => {
    expect(mediaNote(1, false)).toMatch(/picture is attached/)
    expect(mediaNote(3, false)).toMatch(/3 pictures are attached/)
    expect(mediaNote(2, false)).toContain('{"figures": ["48%"], "comment": "..."}')
    expect(mediaNote(2, false)).toMatch(/Never use a number that is in neither the post nor its pictures/)
    expect(mediaNote(1, true, { speech: true })).toMatch(/list every such number first/)
  })

  it("a video: its cover, and it can't be watched", () => {
    expect(mediaNote(1, true)).toMatch(/video cover frame/)
    expect(mediaNote(1, true)).toMatch(/can't watch/)
    expect(mediaNote(0, true)).toMatch(/can't watch/)
  })

  it("a plain post: nothing added", () => {
    expect(mediaNote(0, false)).toBe("")
  })
})
