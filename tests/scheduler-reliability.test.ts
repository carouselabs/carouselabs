import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  user: vi.fn(), publish: vi.fn(), successEmail: vi.fn(), failureEmail: vi.fn(),
  db: {
    scheduledPost: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    recurringSlot: { findMany: vi.fn() }, post: { findFirst: vi.fn(), update: vi.fn() },
    postTag: { findMany: vi.fn() }, linkedInAccount: { findUnique: vi.fn() }, $transaction: vi.fn(),
  },
  PublishError: class extends Error {
    constructor(message: string, public publicationMayHaveSucceeded: boolean) { super(message) }
  },
}))
vi.mock("@/lib/db", () => ({ db: mocks.db }))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }))
vi.mock("@/lib/linkedin", () => ({ postToLinkedIn: mocks.publish, LinkedInPublishError: mocks.PublishError }))
vi.mock("@/lib/email", () => ({ sendScheduledPostFailedEmail: mocks.failureEmail, sendScheduledPostPublishedEmail: mocks.successEmail }))
import { GET } from "@/app/api/cron/publish-scheduled-posts/route"
import { PATCH, DELETE } from "@/app/api/content-hub/scheduled/[id]/route"
import { PUBLICATION_RECONCILIATION_REASON } from "@/lib/scheduledPostState"

const now = new Date("2026-09-30T09:01:00Z")
const context = { params: Promise.resolve({ id: "schedule-a" }) }
function scheduled() {
  return {
    id: "schedule-a", userId: "user-a", postId: "post-a", platform: "linkedin", status: "queued", retryCount: 0,
    scheduledFor: new Date("2026-09-30T09:00:00Z"), updatedAt: new Date("2026-09-29T00:00:00Z"), failureReason: null as string | null,
    post: { id: "post-a", title: "Test draft", caption: "Hello", imageUrls: [], metadata: null },
    user: { id: "user-a", deletedAt: null as Date | null, suspendedAt: null as Date | null, email: "test@example.test", profile: { name: "Test", timezone: "UTC" }, linkedIn: { accessToken: "mock-token", linkedInId: "mock-id", expiresAt: null } },
  }
}
const cronRequest = () => new Request("http://localhost/api/cron/publish-scheduled-posts", { headers: { authorization: "Bearer cron-test" } })
const patchRequest = (body: unknown) => new Request("http://localhost/api/content-hub/scheduled/schedule-a", { method: "PATCH", body: JSON.stringify(body) })

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(now)
  vi.stubEnv("CRON_SECRET", "cron-test")
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "log").mockImplementation(() => {})
  mocks.user.mockResolvedValue({ id: "user-a" })
  mocks.db.recurringSlot.findMany.mockResolvedValue([])
  mocks.db.scheduledPost.findMany.mockResolvedValue([])
  mocks.db.scheduledPost.findUnique.mockResolvedValue(scheduled())
  mocks.db.scheduledPost.findFirst.mockResolvedValue(null)
  mocks.db.scheduledPost.updateMany.mockResolvedValue({ count: 1 })
  mocks.db.scheduledPost.update.mockResolvedValue(scheduled())
  mocks.db.scheduledPost.deleteMany.mockResolvedValue({ count: 1 })
  mocks.db.post.findFirst.mockResolvedValue({ id: "post-a" })
  mocks.db.linkedInAccount.findUnique.mockResolvedValue({ id: "connection-a" })
  mocks.db.$transaction.mockImplementation(async (operation: unknown) => typeof operation === "function" ? operation(mocks.db) : Promise.all(operation as Promise<unknown>[]))
  mocks.publish.mockResolvedValue({ postUrl: "https://www.linkedin.com/feed/update/mock/" })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe("scheduled publication boundaries with mocked provider and database", () => {
  it("rejects an unauthorized cron before accessing data", async () => {
    expect((await GET(new Request("http://localhost/api/cron/publish-scheduled-posts"))).status).toBe(401)
    expect(mocks.db.scheduledPost.updateMany).not.toHaveBeenCalled()
  })
  it("quarantines a stale publishing claim instead of automatically requeuing it", async () => {
    const response = await GET(cronRequest())
    expect(await response.json()).toMatchObject({ reconciliationRequired: 1, published: 0 })
    expect(mocks.db.scheduledPost.updateMany).toHaveBeenCalledWith({
      where: { status: "publishing", updatedAt: { lt: new Date(now.getTime() - 600000) } },
      data: { status: "failed", failureReason: PUBLICATION_RECONCILIATION_REASON },
    })
    expect(mocks.publish).not.toHaveBeenCalled()
  })
  it("does not publish when another worker won the atomic claim", async () => {
    const row = scheduled()
    mocks.db.scheduledPost.findMany.mockResolvedValue([row])
    mocks.db.scheduledPost.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 0 })
    await GET(cronRequest())
    expect(mocks.publish).not.toHaveBeenCalled()
    expect(mocks.db.scheduledPost.updateMany.mock.calls[1][0].where).toMatchObject({ id: row.id, status: "queued", updatedAt: row.updatedAt, scheduledFor: row.scheduledFor, user: { deletedAt: null, suspendedAt: null } })
  })
  it.each(["deletedAt", "suspendedAt"] as const)("does not schedule or publish a %s account", async field => {
    const row = scheduled(); row.user[field] = now
    mocks.db.scheduledPost.findMany.mockResolvedValue([row])
    mocks.db.recurringSlot.findMany.mockResolvedValue([{ id: "slot-a", userId: row.userId, platform: "linkedin", timeOfDay: "09:00", daysOfWeek: [3], user: row.user }])
    await GET(cronRequest())
    expect(mocks.publish).not.toHaveBeenCalled()
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
    expect(mocks.db.scheduledPost.findMany.mock.calls[0][0].where.user).toEqual({ deletedAt: null, suspendedAt: null })
  })
  it("never automatically retries a provider timeout after publication dispatch", async () => {
    mocks.db.scheduledPost.findMany.mockResolvedValue([scheduled()])
    mocks.publish.mockRejectedValue(new mocks.PublishError("Provider uncertain", true))
    await GET(cronRequest())
    expect(mocks.publish).toHaveBeenCalledOnce()
    expect(mocks.db.scheduledPost.update).toHaveBeenCalledWith({ where: { id: "schedule-a" }, data: { status: "failed", retryCount: 1, failureReason: PUBLICATION_RECONCILIATION_REASON } })
  })
  it("retries a confirmed preparation failure with a bounded attempt count", async () => {
    mocks.db.scheduledPost.findMany.mockResolvedValue([scheduled()])
    mocks.publish.mockRejectedValue(new mocks.PublishError("Preparation failed", false))
    await GET(cronRequest())
    expect(mocks.db.scheduledPost.update).toHaveBeenCalledWith({ where: { id: "schedule-a" }, data: { status: "queued", retryCount: 1, failureReason: "Preparation failed", scheduledFor: new Date(now.getTime() + 300000) } })
    mocks.db.scheduledPost.findMany.mockResolvedValue([{ ...scheduled(), retryCount: 2 }])
    await GET(cronRequest())
    expect(mocks.db.scheduledPost.update).toHaveBeenLastCalledWith({ where: { id: "schedule-a" }, data: { status: "failed", retryCount: 3, failureReason: "Preparation failed" } })
  })
  it("preserves a confirmed publication URL for reconciliation if the final database write fails", async () => {
    mocks.db.scheduledPost.findMany.mockResolvedValue([scheduled()])
    mocks.db.$transaction.mockRejectedValueOnce(new Error("Database unavailable"))
    await GET(cronRequest())
    expect(mocks.publish).toHaveBeenCalledOnce()
    expect(mocks.db.scheduledPost.update).toHaveBeenLastCalledWith({ where: { id: "schedule-a" }, data: { status: "failed", retryCount: 1, failureReason: PUBLICATION_RECONCILIATION_REASON, publishedUrl: "https://www.linkedin.com/feed/update/mock/" } })
    expect(mocks.successEmail).not.toHaveBeenCalled()
  })
  it("reserves recurring content transactionally and retries only serialization conflicts", async () => {
    mocks.db.recurringSlot.findMany.mockResolvedValue([{ id: "slot-a", userId: "user-a", platform: "linkedin", timeOfDay: "09:00", daysOfWeek: [3], user: scheduled().user }])
    mocks.db.$transaction.mockRejectedValueOnce({ code: "P2034" })
    const response = await GET(cronRequest())
    expect(await response.json()).toMatchObject({ recurringCreated: 1 })
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(2)
    expect(mocks.db.$transaction.mock.calls[1][1]).toEqual({ isolationLevel: "Serializable", timeout: 10000 })
    expect(mocks.db.post.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "user-a", user: { deletedAt: null, suspendedAt: null }, status: { not: "PUBLISHED" }, scheduledPosts: { none: { status: { in: ["queued", "publishing", "published", "failed"] } } } })
    expect(mocks.db.scheduledPost.create).toHaveBeenCalledOnce()
  })
  it("keeps a successful publication successful if notification delivery fails and redacts that error", async () => {
    mocks.db.scheduledPost.findMany.mockResolvedValue([scheduled()])
    mocks.successEmail.mockRejectedValue(new Error("private message and token"))
    expect(await (await GET(cronRequest())).json()).toMatchObject({ published: 1, failed: 0 })
    expect(console.error).toHaveBeenCalledWith("[cron/publish-scheduled-posts] email failed:", "Error")
  })
})

describe("schedule ownership, edit races and manual reconciliation", () => {
  it("denies another user's schedule for both editing and deletion", async () => {
    mocks.db.scheduledPost.findUnique.mockResolvedValue({ ...scheduled(), userId: "user-b" })
    expect((await PATCH(patchRequest({ status: "queued" }), context)).status).toBe(404)
    expect((await DELETE(new Request("http://localhost"), context)).status).toBe(404)
    expect(mocks.db.scheduledPost.update).not.toHaveBeenCalled()
    expect(mocks.db.scheduledPost.deleteMany).not.toHaveBeenCalled()
  })
  it("blocks changing or deleting a claimed publishing row", async () => {
    mocks.db.scheduledPost.findUnique.mockResolvedValue({ ...scheduled(), status: "publishing" })
    expect((await PATCH(patchRequest({ status: "queued" }), context)).status).toBe(409)
    expect((await DELETE(new Request("http://localhost"), context)).status).toBe(409)
  })
  it("requires explicit confirmation before requeueing an uncertain publication", async () => {
    mocks.db.scheduledPost.findUnique.mockResolvedValue({ ...scheduled(), status: "failed", failureReason: PUBLICATION_RECONCILIATION_REASON })
    expect((await PATCH(patchRequest({ status: "queued" }), context)).status).toBe(409)
    expect((await DELETE(new Request("http://localhost"), context)).status).toBe(409)
    expect((await PATCH(patchRequest({ status: "queued", confirmNotPublished: true }), context)).status).toBe(200)
    expect(mocks.db.scheduledPost.update.mock.calls[0][0].data).toMatchObject({ status: "queued", failureReason: null, retryCount: 0 })
  })
  it("returns a conflict when a cron claims the row during editing or deletion", async () => {
    mocks.db.scheduledPost.update.mockRejectedValueOnce({ code: "P2025" })
    expect((await PATCH(patchRequest({ status: "cancelled" }), context)).status).toBe(409)
    expect(mocks.db.scheduledPost.update.mock.calls[0][0].where).toMatchObject({ userId: "user-a", status: "queued", updatedAt: scheduled().updatedAt })
    mocks.db.scheduledPost.deleteMany.mockResolvedValueOnce({ count: 0 })
    expect((await DELETE(new Request("http://localhost"), context)).status).toBe(409)
  })
})
