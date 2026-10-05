import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), currentUser: vi.fn(), clerkUser: vi.fn(), admin: vi.fn(), createMessage: vi.fn(),
  user: { findUnique: vi.fn() }, linkedInAccount: { deleteMany: vi.fn() },
  profile: { update: vi.fn() }, intern: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() }, leaderboard: vi.fn(),
}))
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, currentUser: mocks.clerkUser }))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.currentUser }))
vi.mock("@/lib/adminAuth", () => ({ getAdminUser: mocks.admin, isAdminEmail: () => false }))
vi.mock("@/lib/db", () => ({ db: { user: mocks.user, profile: mocks.profile, linkedInAccount: mocks.linkedInAccount, intern: mocks.intern } }))
vi.mock("@/lib/credits", () => ({ availableCredits: () => 10, extraCreditsValid: () => false, FREE_LIFETIME_CREDITS: 20 }))
vi.mock("@/lib/internPoints", () => ({ getLeaderboard: mocks.leaderboard, getPeriodRange: () => null }))
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: mocks.createMessage } } }))
import { GET as me } from "@/app/api/me/route"
import { GET as status } from "@/app/api/linkedin/status/route"
import { POST as disconnect } from "@/app/api/linkedin/disconnect/route"
import { GET as suggestions } from "@/app/api/ideas/suggestions/route"
import { GET as leaderboard } from "@/app/api/intern/leaderboard/route"

const activeUser = { id: "user-a", clerkId: "clerk-a", email: "a@example.com", suspendedAt: null, deletedAt: null, linkedIn: { name: "A", expiresAt: null } }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ userId: "clerk-a" })
  mocks.currentUser.mockResolvedValue(activeUser)
  mocks.user.findUnique.mockResolvedValue(activeUser)
  mocks.admin.mockResolvedValue(null)
  mocks.clerkUser.mockResolvedValue({ id: activeUser.clerkId, primaryEmailAddress: { emailAddress: activeUser.email, verification: { status: "verified" } } })
  mocks.intern.findUnique.mockResolvedValue(null)
  mocks.intern.findFirst.mockResolvedValue(null)
  mocks.leaderboard.mockResolvedValue([])
})

describe("direct session routes enforce active accounts", () => {
  it.each(["deletedAt", "suspendedAt"])("denies %s accounts before reads, AI calls or writes", async (flag) => {
    mocks.user.findUnique.mockResolvedValue({ ...activeUser, [flag]: new Date() })
    for (const handler of [me, status, disconnect, suggestions]) {
      const response = await handler()
      expect(response.status).toBe(403)
      expect(await response.text()).not.toContain("a@example.com")
    }
    expect(mocks.linkedInAccount.deleteMany).not.toHaveBeenCalled()
    expect(mocks.createMessage).not.toHaveBeenCalled()
    expect(mocks.profile.update).not.toHaveBeenCalled()
  })
  it("denies unauthenticated account and LinkedIn access without DB reads", async () => {
    mocks.auth.mockResolvedValue({ userId: null })
    for (const handler of [me, status, disconnect]) expect((await handler()).status).toBe(401)
    expect(mocks.user.findUnique).not.toHaveBeenCalled()
  })
  it("returns generic suggestion fallback to anonymous users without spending AI tokens", async () => {
    mocks.auth.mockResolvedValue({ userId: null })
    const response = await suggestions()
    expect(response.status).toBe(200)
    expect((await response.json()).suggestions.length).toBeGreaterThan(0)
    expect(mocks.user.findUnique).not.toHaveBeenCalled()
    expect(mocks.createMessage).not.toHaveBeenCalled()
  })
  it("scopes User B's disconnect to User B's resolved account", async () => {
    mocks.auth.mockResolvedValue({ userId: "clerk-b" })
    mocks.user.findUnique.mockImplementation(async ({ where }) => where.clerkId === "clerk-b" ? { ...activeUser, id: "user-b", clerkId: "clerk-b" } : null)
    expect((await disconnect()).status).toBe(200)
    expect(mocks.user.findUnique).toHaveBeenCalledWith({ where: { clerkId: "clerk-b" } })
    expect(mocks.linkedInAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-b" } })
  })
  it("keeps active account and connection reads working", async () => {
    expect((await me()).status).toBe(200)
    expect(await (await status()).json()).toMatchObject({ connected: true, name: "A" })
  })
})

describe("intern leaderboard authorization", () => {
  const request = () => new Request("https://app.test/api/intern/leaderboard?period=month")
  it("denies ordinary users before reading intern rankings", async () => {
    expect((await leaderboard(request())).status).toBe(403)
    expect(mocks.leaderboard).not.toHaveBeenCalled()
  })
  it("denies expired sessions before membership reads", async () => {
    mocks.currentUser.mockResolvedValue(null)
    expect((await leaderboard(request())).status).toBe(401)
    expect(mocks.intern.findFirst).not.toHaveBeenCalled()
    expect(mocks.leaderboard).not.toHaveBeenCalled()
  })
  it("allows a verified admin even without an intern record", async () => {
    mocks.admin.mockResolvedValue({ id: "admin" })
    expect((await leaderboard(request())).status).toBe(200)
    expect(mocks.leaderboard).toHaveBeenCalledWith("month")
  })
  it("requires active membership and will not match another bound identity by email", async () => {
    const internB = { id: "intern-b", active: true, clerkId: "clerk-b", email: activeUser.email }
    mocks.intern.findUnique.mockImplementation(async ({ where }) => where.clerkId === internB.clerkId ? internB : null)
    mocks.intern.findFirst.mockImplementation(async ({ where }) =>
      where.clerkId === internB.clerkId ? internB : null)
    expect((await leaderboard(request())).status).toBe(403)
    expect(mocks.leaderboard).not.toHaveBeenCalled()
  })
  it("allows an active intern's own stable identity", async () => {
    mocks.intern.findUnique.mockResolvedValue({ id: "intern-a" })
    mocks.intern.findFirst.mockResolvedValue({ id: "intern-a", active: true, clerkId: activeUser.clerkId })
    expect((await leaderboard(request())).status).toBe(200)
    expect(mocks.intern.findFirst).toHaveBeenCalledWith({ where: { id: "intern-a", active: true } })
  })
  it("denies a linked intern whose membership is no longer active", async () => {
    mocks.intern.findUnique.mockResolvedValue({ id: "intern-a" })
    expect((await leaderboard(request())).status).toBe(403)
    expect(mocks.leaderboard).not.toHaveBeenCalled()
  })
})
