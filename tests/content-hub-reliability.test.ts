import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  user: vi.fn(), transaction: vi.fn(), outsidePost: vi.fn(), outsideSchedule: vi.fn(),
  linkedIn: vi.fn(), queue: vi.fn(), reupload: vi.fn(), upload: vi.fn(),
}))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }))
vi.mock("@/lib/db", () => ({ db: {
  $transaction: mocks.transaction,
  post: { create: mocks.outsidePost },
  scheduledPost: { create: mocks.outsideSchedule },
  linkedInAccount: { findUnique: mocks.linkedIn },
} }))
vi.mock("@/lib/queue", () => ({ nextAvailableQueueSlot: mocks.queue }))
vi.mock("@/lib/externalImage", () => ({ reuploadExternalImage: mocks.reupload }))
vi.mock("@/lib/r2", () => ({ uploadToR2: mocks.upload }))

import { POST as bulkUpload } from "@/app/api/content-hub/bulk-upload/route"
import { POST as uploadImage } from "@/app/api/content-hub/custom-post/upload/route"

type RecordData = Record<string, unknown>
type SavedRecord = RecordData & { id: string }
type Transaction = {
  post: { create: (input: { data: RecordData }) => Promise<SavedRecord> }
  scheduledPost: { create: (input: { data: RecordData }) => Promise<SavedRecord> }
}

let posts: SavedRecord[]
let schedules: SavedRecord[]
let failScheduleFor: string | null
let failPostFor: string | null
const scheduledAt = new Date("2099-01-01T12:00:00Z")
const request = (path: string, body: unknown) => new Request("https://app.test" + path, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
})
const row = (caption: string, platform = "linkedin") => ({ caption, platform, scheduledFor: "queue" })
const bulk = (rows: unknown[]) => bulkUpload(request("/api/content-hub/bulk-upload", { rows, timeZone: "UTC" }))

beforeEach(() => {
  vi.resetAllMocks()
  posts = []
  schedules = []
  failScheduleFor = null
  failPostFor = null
  mocks.user.mockResolvedValue({ id: "user-a" })
  mocks.linkedIn.mockResolvedValue({ id: "connection-a" })
  mocks.queue.mockResolvedValue(scheduledAt)
  mocks.reupload.mockResolvedValue("https://media.test/bulk-upload/user-a/image.png")
  mocks.upload.mockResolvedValue("https://media.test/custom-posts/user-a/image.png")

  // This double commits staged rows only when the callback succeeds, matching
  // the database transaction contract. It cannot verify PostgreSQL itself.
  let sequence = 0
  mocks.transaction.mockImplementation(async (callback: (tx: Transaction) => Promise<unknown>) => {
    const stagedPosts: SavedRecord[] = []
    const stagedSchedules: SavedRecord[] = []
    const result = await callback({
      post: { create: async ({ data }) => {
        if (data.caption === failPostFor) throw new Error("Post save failed")
        const record = { ...data, id: "post-" + ++sequence }
        stagedPosts.push(record)
        return record
      } },
      scheduledPost: { create: async ({ data }) => {
        const post = stagedPosts.find((record) => record.id === data.postId)
        if (post?.caption === failScheduleFor) throw new Error("Schedule save failed")
        const record = { ...data, id: "schedule-" + sequence }
        stagedSchedules.push(record)
        return record
      } },
    })
    posts.push(...stagedPosts)
    schedules.push(...stagedSchedules)
    return result
  })
})

describe("bulk import row atomicity", () => {
  it("denies an expired session before processing rows or writing", async () => {
    mocks.user.mockResolvedValue(null)
    expect((await bulk([row("Draft")])).status).toBe(401)
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.queue).not.toHaveBeenCalled()
  })

  it("commits each valid post and schedule together with owner and platform status intact", async () => {
    const response = await bulk([row("LinkedIn draft"), row("Other platform draft", "instagram")])
    expect(response.status).toBe(200)
    const { results } = await response.json()
    expect(results.map((result: { ok: boolean }) => result.ok)).toEqual([true, true])
    expect(posts.map((post) => post.caption)).toEqual(["LinkedIn draft", "Other platform draft"])
    expect(schedules).toEqual([
      expect.objectContaining({ postId: results[0].postId, userId: "user-a", platform: "linkedin", scheduledFor: scheduledAt, status: "queued" }),
      expect.objectContaining({ postId: results[1].postId, userId: "user-a", platform: "instagram", status: "pending_connection" }),
    ])
    expect(posts.every((post) => post.userId === "user-a" && post.format === "CUSTOM")).toBe(true)
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.outsidePost).not.toHaveBeenCalled()
    expect(mocks.outsideSchedule).not.toHaveBeenCalled()
  })

  it("rolls back a rejected schedule, continues later rows, and allows retry without orphan duplicates", async () => {
    failScheduleFor = "Retry this"
    const response = await bulk([row("Retry this"), row("Keep this")])
    expect(await response.json()).toEqual({ results: [
      { row: 0, ok: false, error: "Schedule save failed" },
      { row: 1, ok: true, postId: expect.any(String) },
    ] })
    expect(posts.map((post) => post.caption)).toEqual(["Keep this"])
    expect(schedules).toHaveLength(1)
    expect(schedules[0].postId).toBe(posts[0].id)

    failScheduleFor = null
    const retry = await bulk([row("Retry this")])
    expect((await retry.json()).results[0].ok).toBe(true)
    expect(posts.map((post) => post.caption)).toEqual(["Keep this", "Retry this"])
    expect(schedules).toHaveLength(2)
    expect(mocks.transaction).toHaveBeenCalledTimes(3)
  })

  it("does not create a schedule for a rejected post and preserves independent row success", async () => {
    failPostFor = "Cannot save"
    const response = await bulk([row("Cannot save"), row("Next valid row")])
    const { results } = await response.json()
    expect(results.map((result: { ok: boolean }) => result.ok)).toEqual([false, true])
    expect(posts.map((post) => post.caption)).toEqual(["Next valid row"])
    expect(schedules).toHaveLength(1)
  })
})

describe("custom image upload log privacy", () => {
  it("logs only error classification for a rejected remote re-host", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.reupload.mockRejectedValue(new Error("private-provider-payload"))
    const response = await uploadImage(request("/api/content-hub/custom-post/upload", { sourceUrl: "https://images.test/example.png" }))
    expect(response.status).toBe(400)
    expect(logs).toHaveBeenCalledWith("[content-hub/custom-post/upload] sourceUrl re-host failed:", { name: "Error" })
    expect(JSON.stringify(logs.mock.calls)).not.toContain("private-provider-payload")
    expect(mocks.reupload).toHaveBeenCalledTimes(1)
  })

  it("logs only error classification and returns a generic failure for storage rejection", async () => {
    const logs = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.upload.mockRejectedValue(new Error("private-storage-payload"))
    const imageBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64")
    const response = await uploadImage(request("/api/content-hub/custom-post/upload", { imageBase64, mediaType: "image/png" }))
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "Failed to upload image" })
    expect(logs).toHaveBeenCalledWith("[content-hub/custom-post/upload] R2 upload failed:", { name: "Error" })
    expect(JSON.stringify(logs.mock.calls)).not.toContain("private-storage-payload")
    expect(mocks.upload).toHaveBeenCalledTimes(1)
  })
})
