import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  user: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn(),
  idea: vi.fn(), create: vi.fn(), upsert: vi.fn(), email: vi.fn(),
}))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }))
vi.mock("@/lib/email", () => ({ notifyFirstPostIfFirst: mocks.email }))
vi.mock("@/lib/db", () => ({ db: {
  post: { findFirst: mocks.findFirst, updateMany: mocks.updateMany, create: mocks.create, upsert: mocks.upsert },
  idea: { findFirst: mocks.idea },
  $transaction: (fn: (tx: unknown) => unknown) => fn({ post: { updateMany: mocks.updateMany }, slide: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } }),
} }))
import { GET, PATCH } from "@/app/api/posts/[id]/route"
import { GET as GETByIdea, POST } from "@/app/api/posts/route"
import { createDraftWriter } from "@/lib/postDraft"

const revision = "2026-09-28T10:00:00.000Z"
const context = { params: Promise.resolve({ id: "postB" }) }
const patchRequest = (body: unknown) => new Request("http://localhost/api/posts/postB", { method: "PATCH", body: JSON.stringify(body) })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", "https://media.test")
  mocks.user.mockResolvedValue({ id: "userA", email: "a@example.test" })
  mocks.findFirst.mockResolvedValue(null)
  mocks.updateMany.mockResolvedValue({ count: 1 })
  mocks.idea.mockResolvedValue({ hook: "Title" })
  mocks.email.mockResolvedValue(undefined)
})

afterEach(() => vi.unstubAllEnvs())

describe("post ownership and concurrency", () => {
  it("denies unauthenticated reads and mutations before database access", async () => {
    mocks.user.mockResolvedValue(null)
    expect((await GET(new Request("http://localhost/api/posts/postB"), context)).status).toBe(401)
    expect((await PATCH(patchRequest({ caption: "attack", expectedUpdatedAt: revision }), context)).status).toBe(401)
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })
  it("scopes both reads and writes to user A and conceals user B's resource", async () => {
    expect((await GET(new Request("http://localhost/api/posts/postB"), context)).status).toBe(404)
    expect((await PATCH(patchRequest({ caption: "attack", expectedUpdatedAt: revision }), context)).status).toBe(404)
    expect(mocks.findFirst.mock.calls.every(([args]) => args.where.userId === "userA" && args.where.id === "postB")).toBe(true)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
  it("rejects stale revisions and keeps image children unchanged", async () => {
    mocks.findFirst.mockResolvedValue({ id: "postB", caption: "newer", updatedAt: new Date(revision), format: "TEXT_ONLY" })
    mocks.updateMany.mockResolvedValue({ count: 0 })
    const response = await PATCH(patchRequest({ caption: "old edit", expectedUpdatedAt: revision }), context)
    expect(response.status).toBe(409)
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({ id: "postB", userId: "userA", updatedAt: new Date(revision) })
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })
  it("requires a revision and caps caption length", async () => {
    expect((await PATCH(patchRequest({ caption: "x" }), context)).status).toBe(400)
    expect((await PATCH(patchRequest({ caption: "x".repeat(100001), expectedUpdatedAt: revision }), context)).status).toBe(400)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
  it("persists carousel dimensions without dropping other saved metadata", async () => {
    mocks.findFirst.mockResolvedValue({ id: "postB", caption: "same", updatedAt: new Date(revision), format: "CAROUSEL", metadata: { size: "4:5", imagePrompt: "Keep this" } })
    const response = await PATCH(patchRequest({ caption: "same", size: "1:1", expectedUpdatedAt: revision }), context)
    expect(response.status).toBe(200)
    expect(mocks.updateMany.mock.calls[0][0].data.metadata).toEqual({ size: "1:1", imagePrompt: "Keep this" })
  })
  it("returns private, uncached restore data and isolates generation formats", async () => {
    const response = await GETByIdea(new Request("http://localhost/api/posts?ideaId=ideaA&format=CAROUSEL"))
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ userId: "userA", ideaId: "ideaA", format: "CAROUSEL" })
  })
  it("uses the same owner-scoped creation ID on retry", async () => {
    mocks.upsert.mockImplementation(async ({ create }) => ({ ...create, slides: create.slides?.create ?? [], updatedAt: new Date(revision) }))
    const body = { ideaId: "ideaA", caption: "Hello", requestId: "8063f8ec-ec82-4329-98f4-1db41653257b" }
    const request = () => new Request("http://localhost/api/posts", { method: "POST", body: JSON.stringify(body) })
    expect((await POST(request())).status).toBe(200)
    expect((await POST(request())).status).toBe(200)
    const idA = mocks.upsert.mock.calls[0][0].where.id
    expect(mocks.upsert.mock.calls[1][0].where.id).toBe(idA)
    mocks.user.mockResolvedValue({ id: "userB", email: "b@example.test" })
    await POST(request())
    expect(mocks.upsert.mock.calls[2][0].where.id).not.toBe(idA)
  })
})


describe("single image draft persistence", () => {
  const image = { imageUrl: "https://media.test/posts/userA/recovered.png", imagePrompt: "Recovered prompt" }
  it("updates the caption, media, metadata and slide together after checking the revision", async () => {
    mocks.findFirst.mockResolvedValue({ id: "postB", caption: "same", updatedAt: new Date(revision), format: "SINGLE_IMAGE", title: "Title", metadata: { size: "4:5", other: "keep" } })
    expect((await PATCH(patchRequest({ caption: "same", expectedUpdatedAt: revision, size: "1:1", image }), context)).status).toBe(200)
    expect(mocks.updateMany.mock.calls[0][0].data).toMatchObject({ imageUrls: [image.imageUrl], r2Keys: ["posts/userA/recovered.png"], metadata: { size: "1:1", imagePrompt: image.imagePrompt, other: "keep" } })
    expect(mocks.createMany.mock.calls[0][0].data[0]).toMatchObject({ postId: "postB", imageUrl: image.imageUrl, role: "COVER" })
  })
  it("rejects another user's image on create and update before writing", async () => {
    const foreign = { ...image, imageUrl: "https://media.test/posts/userB/private.png" }
    expect((await PATCH(patchRequest({ caption: "same", expectedUpdatedAt: revision, image: foreign }), context)).status).toBe(400)
    expect((await POST(new Request("http://localhost/api/posts", { method: "POST", body: JSON.stringify({ ideaId: "ideaA", caption: "same", image: foreign }) }))).status).toBe(400)
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("does not replace media children when the revision is stale", async () => {
    mocks.findFirst.mockResolvedValue({ id: "postB", caption: "same", updatedAt: new Date(revision), format: "SINGLE_IMAGE" })
    mocks.updateMany.mockResolvedValue({ count: 0 })
    expect((await PATCH(patchRequest({ caption: "same", expectedUpdatedAt: revision, image }), context)).status).toBe(409)
    expect(mocks.deleteMany).not.toHaveBeenCalled()
    expect(mocks.createMany).not.toHaveBeenCalled()
  })
  it("creates a single-image post that can be scheduled with its actual media", async () => {
    mocks.create.mockImplementation(async ({ data }) => ({ ...data, slides: data.slides?.create ?? [], id: "new", updatedAt: new Date(revision) }))
    const response = await POST(new Request("http://localhost/api/posts", { method: "POST", body: JSON.stringify({ ideaId: "ideaA", caption: "same", size: "1:1", image }) }))
    expect(response.status).toBe(200)
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ format: "SINGLE_IMAGE", status: "READY", imageUrls: [image.imageUrl], metadata: { imagePrompt: image.imagePrompt, size: "1:1" } })
  })
})


describe("create replay content confirmation", () => {
  const requestId = "8063f8ec-ec82-4329-98f4-1db41653257b"
  const image = () => ({ ideaId: "ideaA", caption: "same", requestId, size: "4:5",
    image: { imageUrl: "https://media.test/posts/userA/saved.png", imagePrompt: "Original prompt" } })
  const carousel = () => ({ ideaId: "ideaA", caption: "same", requestId, size: "4:5", slides: [
    { slideNumber: 1, role: "hook", headline: "First", imageUrl: "https://media.test/carousel/userA/one.png", prompt: "First prompt" },
    { slideNumber: 2, role: "body", headline: "Second", imageUrl: "https://media.test/carousel/userA/two.png", prompt: "Second prompt" },
  ] })
  const request = (body: unknown) => new Request("http://localhost/api/posts", { method: "POST", body: JSON.stringify(body) })

  beforeEach(() => {
    // Persist the first payload. Replaying an ID must return that actual row,
    // not echo the replacement create payload from the second request.
    const rows = new Map<string, unknown>()
    mocks.upsert.mockImplementation(async ({ where, create }) => {
      if (!rows.has(where.id)) rows.set(where.id, structuredClone({ ...create,
        slides: create.slides?.create ?? [], updatedAt: new Date(revision) }))
      return structuredClone(rows.get(where.id))
    })
  })

  it.each([
    ["image dimensions", () => image(), () => ({ ...image(), size: "1:1" })],
    ["image prompt", () => image(), () => ({ ...image(), image: { ...image().image, imagePrompt: "Changed prompt" } })],
    ["carousel dimensions", () => carousel(), () => ({ ...carousel(), size: "1:1" })],
    ["slide headline", () => carousel(), () => ({ ...carousel(), slides: carousel().slides.map((slide) => ({ ...slide, headline: "Changed headline" })) })],
    ["slide role", () => carousel(), () => ({ ...carousel(), slides: carousel().slides.map((slide) => ({ ...slide, role: "cta" })) })],
    ["slide number", () => carousel(), () => ({ ...carousel(), slides: carousel().slides.map((slide) => ({ ...slide, slideNumber: slide.slideNumber + 2 })) })],
    ["slide prompt", () => carousel(), () => ({ ...carousel(), slides: carousel().slides.map((slide) => ({ ...slide, prompt: "Changed prompt" })) })],
    ["removed slide prompt", () => carousel(), () => ({ ...carousel(), slides: carousel().slides.map((slide) => ({ ...slide, prompt: undefined })) })],
  ] as const)("rejects changed %s after an unconfirmed create without overwriting the saved row", async (_name, original, changed) => {
    const first = await POST(request(original()))
    expect(first.status).toBe(200)
    const replay = await POST(request(changed()))
    expect(replay.status).toBe(409)
    expect(await replay.json()).toEqual({ error: expect.stringContaining("Copy them, then reopen") })
    expect(mocks.upsert.mock.calls[1][0].update).toEqual({})
    expect(mocks.email).toHaveBeenCalledTimes(1)
    // The original operation still matches; rejecting the retry did not mutate it.
    expect((await POST(request(original()))).status).toBe(200)
  })

  it("accepts equivalent carousel retries with reordered input and omitted default size", async () => {
    const original = carousel()
    expect((await POST(request(original))).status).toBe(200)
    const retry = await POST(request({ ...original, size: undefined, slides: original.slides.slice().reverse() }))
    expect(retry.status).toBe(200)
    expect(await retry.json()).toEqual(await (await POST(request(original))).json())
  })

  it("rejects a saved format that no longer matches the creation request", async () => {
    const original = image()
    expect((await POST(request(original))).status).toBe(200)
    const saved = await mocks.upsert.mock.results[0].value
    mocks.upsert.mockResolvedValueOnce({ ...saved, format: "CAROUSEL" })
    expect((await POST(request(original))).status).toBe(409)
  })

  it("never marks changed media saved after the first create response is lost", async () => {
    let loseResponse = true
    const fetchDraft = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const response = await POST(new Request("http://localhost/api/posts", init))
      if (loseResponse) { loseResponse = false; throw new TypeError("Response lost after commit") }
      return response
    })
    const writer = createDraftWriter("ideaA", fetchDraft)
    await expect(writer.save("same", null, undefined, "4:5", image().image)).rejects.toThrow("could not be confirmed")
    await expect(writer.save("same", null, undefined, "1:1", image().image)).rejects.toThrow("reopen the saved draft")
    expect(writer.revision()).toBeUndefined()
    expect(fetchDraft).toHaveBeenCalledTimes(2)
    await expect(writer.save("same", null, undefined, "4:5", image().image)).resolves.toMatchObject({ size: "4:5", updatedAt: revision })
  })
})
