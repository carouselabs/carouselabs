import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), currentUser: vi.fn(), applyPendingPrefill: vi.fn(),
  db: {
    user: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    subscription: { upsert: vi.fn() },
    extensionApiKey: { findUnique: vi.fn(), update: vi.fn() },
    extensionToken: { findFirst: vi.fn(), update: vi.fn() },
    engageClientInfo: { upsert: vi.fn() },
  },
}))
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, currentUser: mocks.currentUser }))
vi.mock("@/lib/db", () => ({ db: mocks.db }))
vi.mock("@/lib/profile/pendingPrefill", () => ({ applyPendingPrefill: mocks.applyPendingPrefill }))
import { getCurrentUser } from "@/lib/auth"
import { getAdminUser } from "@/lib/adminAuth"
import { getUserFromCommentExtensionToken, getExtensionUser } from "@/lib/extensionCommentAuth"

const user = { id: "user-a", clerkId: "clerk-a", email: "admin@example.com", subscription: { id: "sub-a" }, deletedAt: null, suspendedAt: null }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
  mocks.auth.mockResolvedValue({ userId: "clerk-a" })
  mocks.currentUser.mockResolvedValue({
    id: "clerk-a", primaryEmailAddress: { emailAddress: "admin@example.com", verification: { status: "verified" } },
  })
  mocks.db.user.findUnique.mockResolvedValue(user)
  mocks.db.extensionApiKey.update.mockResolvedValue({})
  mocks.db.extensionToken.update.mockResolvedValue({})
  mocks.db.engageClientInfo.upsert.mockResolvedValue({})
})

describe("account identity boundary", () => {
  it("denies signed-out requests without database work", async () => {
    mocks.auth.mockResolvedValue({ userId: null })
    expect(await getCurrentUser()).toBeNull()
    expect(mocks.db.user.findUnique).not.toHaveBeenCalled()
  })
  it.each(["deletedAt", "suspendedAt"])("denies %s account sessions", async (flag) => {
    mocks.db.user.findUnique.mockResolvedValue({ ...user, [flag]: new Date() })
    expect(await getCurrentUser()).toBeNull()
  })
  it("never lets user B take user A's existing DB identity by matching their email", async () => {
    mocks.auth.mockResolvedValue({ userId: "clerk-b" })
    mocks.currentUser.mockResolvedValue({ id: "clerk-b", primaryEmailAddress: { emailAddress: user.email, verification: { status: "verified" } } })
    mocks.db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user)
    expect(await getCurrentUser()).toBeNull()
    expect(mocks.db.user.update).not.toHaveBeenCalled()
    expect(mocks.db.user.upsert).not.toHaveBeenCalled()
  })
  it("will not bootstrap from an unverified primary email", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null)
    mocks.currentUser.mockResolvedValue({ id: "clerk-a", primaryEmailAddress: { emailAddress: user.email, verification: { status: "unverified" } } })
    expect(await getCurrentUser()).toBeNull()
    expect(mocks.db.user.upsert).not.toHaveBeenCalled()
  })
  it("recovers a competing bootstrap by stable identity after a unique-key race", async () => {
    mocks.db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
      .mockResolvedValueOnce(user).mockResolvedValueOnce(user)
    mocks.db.user.upsert.mockRejectedValue({ code: "P2002" })
    expect(await getCurrentUser()).toEqual(user)
    expect(mocks.db.user.update).not.toHaveBeenCalled()
  })
  it("fails closed if another identity won a concurrent email insert", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null)
    mocks.db.user.upsert.mockRejectedValue({ code: "P2002" })
    expect(await getCurrentUser()).toBeNull()
    expect(mocks.applyPendingPrefill).not.toHaveBeenCalled()
  })
  it("uses an idempotent subscription backfill", async () => {
    mocks.db.user.findUnique.mockResolvedValueOnce({ ...user, subscription: null }).mockResolvedValue(user)
    expect(await getCurrentUser()).toEqual(user)
    expect(mocks.db.subscription.upsert).toHaveBeenCalledWith({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
  })
})

describe("admin authorization", () => {
  it("allows the current verified configured administrator", async () => expect(await getAdminUser()).toEqual(user))
  it("denies stale database admin email if current Clerk primary email changed", async () => {
    mocks.currentUser.mockResolvedValue({ id: "clerk-a", primaryEmailAddress: { emailAddress: "ordinary@example.com", verification: { status: "verified" } } })
    expect(await getAdminUser()).toBeNull()
  })
  it("denies unverified admin email and mismatched Clerk identities", async () => {
    mocks.currentUser.mockResolvedValue({ id: "clerk-a", primaryEmailAddress: { emailAddress: user.email, verification: { status: "unverified" } } })
    expect(await getAdminUser()).toBeNull()
    mocks.currentUser.mockResolvedValue({ id: "clerk-b", primaryEmailAddress: { emailAddress: user.email, verification: { status: "verified" } } })
    expect(await getAdminUser()).toBeNull()
  })
  it("denies an ordinary account even when calling the helper directly", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ ...user, email: "ordinary@example.com" })
    expect(await getAdminUser()).toBeNull()
  })
})

describe("bearer token account status", () => {
  it.each(["deletedAt", "suspendedAt"])("denies existing tokens after %s", async (flag) => {
    const record = { id: "token", user: { ...user, [flag]: new Date() } }
    mocks.db.extensionToken.findFirst.mockResolvedValue(record)
    expect(await getUserFromCommentExtensionToken(new Request("https://app.test", { headers: { Authorization: "Bearer cl_cmt_example" } }))).toBeNull()
    expect(mocks.db.extensionToken.update).not.toHaveBeenCalled()
  })
})


describe("merged Engage authentication behavior", () => {
  it("retains active-token version tracking for the Engage admin", async () => {
    mocks.db.extensionToken.findFirst.mockResolvedValue({ id: "version-token", userId: user.id, user })
    expect(await getUserFromCommentExtensionToken(new Request("https://app.test", {
      headers: { Authorization: "Bearer cl_cmt_example", "x-engage-version": "1.3.0" },
    }))).toEqual(user)
    expect(mocks.db.engageClientInfo.upsert).toHaveBeenCalledWith({
      where: { tokenId: "version-token" },
      create: { tokenId: "version-token", userId: user.id, extensionVersion: "1.3.0", lastSeenAt: expect.any(Date) },
      update: { extensionVersion: "1.3.0", lastSeenAt: expect.any(Date) },
    })
  })
  it("denies a cookie-authenticated write from the same host with a different scheme", async () => {
    expect(await getExtensionUser(new Request("https://app.test/api/ext/settings", {
      method: "POST", headers: { cookie: "__session=example", origin: "http://app.test" },
    }))).toBeNull()
    expect(mocks.auth).not.toHaveBeenCalled()
  })
  it("keeps a same-origin cookie-authenticated write working", async () => {
    expect(await getExtensionUser(new Request("https://app.test/api/ext/settings", {
      method: "POST", headers: { cookie: "__session=example", origin: "https://app.test" },
    }))).toEqual(user)
  })
})
