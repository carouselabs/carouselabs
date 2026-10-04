import { afterEach, describe, it, expect, vi } from "vitest"
import { createDraftWriter } from "@/lib/postDraft"
import { ownedR2Key, slidesSchema } from "@/lib/postInput"

const revision = "2026-09-28T10:00:00.000Z"
const response = (body: unknown, status = 200) => Response.json(body, { status })

afterEach(() => vi.unstubAllGlobals())

describe("ordered draft saves", () => {
  it("serializes writes so an older slow save cannot finish after a newer save", async () => {
    let release!: (value: Response) => void
    const request = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
      .mockResolvedValueOnce(response({ postId: "p1", updatedAt: "2026-09-28T10:00:02.000Z" }))
    const writer = createDraftWriter("idea", request)
    const first = writer.save("first")
    const second = writer.save("second")
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)
    release(response({ postId: "p1", updatedAt: revision }))
    await first
    await second
    expect(request).toHaveBeenCalledTimes(2)
    expect(JSON.parse(request.mock.calls[1][1]!.body as string)).toEqual({ caption: "second", expectedUpdatedAt: revision })
    expect(request.mock.calls[1][1]!.method).toBe("PATCH")
  })

  it("coalesces simultaneous Save and Schedule calls for the same content", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response({ postId: "p1", updatedAt: revision }))
    const writer = createDraftWriter("idea", request)
    const saved = await Promise.all([writer.save("caption"), writer.save("caption")])
    expect(request).toHaveBeenCalledTimes(1)
    expect(saved.map((s) => s.postId)).toEqual(["p1", "p1"])
  })

  it("surfaces an expired session and never caches a failed save as success", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ postId: "p1", updatedAt: revision }))
    const writer = createDraftWriter("idea", request)
    await expect(writer.save("caption")).rejects.toThrow("session expired")
    await expect(writer.save("caption")).resolves.toMatchObject({ postId: "p1" })
    const bodies = request.mock.calls.map((c) => JSON.parse(c[1]!.body as string))
    expect(bodies[0].requestId).toBe(bodies[1].requestId)
  })

  it("retains the revision after a conflict instead of overwriting another session", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response({ error: "Changed in another session" }, 409))
    const writer = createDraftWriter("idea", request)
    writer.restore({ postId: "p1", updatedAt: revision, caption: "old" })
    await expect(writer.save("my edit")).rejects.toThrow("another session")
    await expect(writer.save("my next edit")).rejects.toThrow("another session")
    expect(request.mock.calls.every((c) => JSON.parse(c[1]!.body as string).expectedUpdatedAt === revision)).toBe(true)
  })

  it("does not skip saving a regenerated slide when the caption is unchanged", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response({ postId: "p1", updatedAt: revision }))
    const writer = createDraftWriter("idea", request)
    writer.restore({ postId: "p1", updatedAt: revision, caption: "caption" })
    const slides = [{ slideNumber: 1, role: "hook" as const, headline: "Hello", imageUrl: "https://media.test/carousel/u/new.png" }]
    await writer.save("caption", "p1", slides, "4:5")
    expect(JSON.parse(request.mock.calls[0][1]!.body as string).slides).toEqual(slides)
  })

  it("saves the recovered single image and dimensions even when its caption is unchanged", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response({ postId: "p1", updatedAt: revision }))
    const writer = createDraftWriter("idea", request)
    writer.restore({ postId: "p1", updatedAt: revision, caption: "same" })
    const image = { imageUrl: "https://media.test/posts/u/restored.png", imagePrompt: "Restored prompt" }
    await writer.save("same", "p1", undefined, "1:1", image)
    expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({ caption: "same", size: "1:1", image, expectedUpdatedAt: revision })
    await writer.save("same", "p1", undefined, "1:1", image)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it("rejects malformed success responses instead of displaying Saved", async () => {
    const writer = createDraftWriter("idea", vi.fn<typeof fetch>().mockResolvedValue(response({})))
    await expect(writer.save("caption")).rejects.toThrow("did not confirm")
  })

  it("persists a changed export size even when the caption and slides are unchanged", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => response({ postId: "p1", updatedAt: revision }))
    const writer = createDraftWriter("idea", request)
    const slides = [{ slideNumber: 1, role: "hook" as const, headline: "Hello", imageUrl: "https://media.test/carousel/u/new.png" }]
    await writer.save("caption", null, slides, "4:5")
    await writer.save("caption", null, slides, "1:1")
    expect(request).toHaveBeenCalledTimes(2)
    expect(JSON.parse(request.mock.calls[1][1]!.body as string)).toMatchObject({ size: "1:1", expectedUpdatedAt: revision })
  })

  it("does not mark an incomplete local snapshot current after a successful server save", async () => {
    const setItem = vi.fn()
    vi.stubGlobal("localStorage", { getItem: () => null, setItem })
    const request = vi.fn<typeof fetch>().mockResolvedValue(response({ postId: "p1", updatedAt: "2026-09-28T10:00:02.000Z" }))
    const writer = createDraftWriter("idea", request, "draft")
    writer.restore({ postId: "p1", updatedAt: revision, caption: "before" })
    await writer.save("after")
    expect(setItem).not.toHaveBeenCalled()
    expect(writer.revision()).toBe("2026-09-28T10:00:02.000Z")
  })

  it("advances the known browser base without replacing edits typed during the save", async () => {
    const values = new Map([["draft:revision", revision], ["draft", "newer unsaved typing"]])
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
    const request = vi.fn<typeof fetch>().mockResolvedValue(response({ postId: "p1", updatedAt: "2026-09-28T10:00:02.000Z" }))
    const writer = createDraftWriter("idea", request, "draft")
    writer.restore({ postId: "p1", updatedAt: revision, caption: "before" })
    await writer.save("submitted earlier")
    expect(values.get("draft")).toBe("newer unsaved typing")
    expect(values.get("draft:revision")).toBe("2026-09-28T10:00:02.000Z")
  })

  it("turns network timeouts into recoverable errors without retrying a mutation", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("Timeout", "TimeoutError"))
    const writer = createDraftWriter("idea", request)
    await expect(writer.save("caption")).rejects.toThrow("save could not be confirmed")
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe("owned asset validation", () => {
  const base = "https://media.test/assets"
  it("accepts only owner-scoped paths on the exact storage origin", () => {
    expect(ownedR2Key(`${base}/carousel/userA/i/1.png`, "userA", ["carousel"], base)).toBe("carousel/userA/i/1.png")
    for (const url of [
      `${base}/carousel/userB/i/1.png`, "https://media.test.evil.test/assets/carousel/userA/1.png",
      "https://user:password@media.test/assets/carousel/userA/1.png", `${base}/carousel/userA/%2e%2e/userB/1.png`,
      `${base}/carousel/userA/%2E%2E%2FuserB/1.png`, `${base}/carousel/userA/1.png?token=secret`,
    ]) expect(ownedR2Key(url, "userA", ["carousel"], base)).toBeNull()
  })
  it("fails closed when storage configuration is missing", () => {
    expect(ownedR2Key("https://media.test/carousel/userA/a.png", "userA", ["carousel"], "")).toBeNull()
  })
  it("rejects duplicate slide numbers and excessive payloads", () => {
    const slide = { slideNumber: 1, role: "hook", headline: "a", imageUrl: `${base}/carousel/userA/a.png` }
    expect(slidesSchema.safeParse([slide, slide]).success).toBe(false)
    expect(slidesSchema.safeParse([{ ...slide, headline: "a".repeat(2001) }]).success).toBe(false)
  })
})
