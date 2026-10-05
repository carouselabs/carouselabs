import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  intern: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  attendance: { findUnique: vi.fn(), create: vi.fn() },
  leave: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
  transaction: vi.fn(),
}))
vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.currentUser }))
vi.mock("@/lib/db", () => ({ db: {
  intern: mocks.intern, internAttendance: mocks.attendance, internLeaveRequest: mocks.leave,
  $transaction: mocks.transaction,
} }))
import { getOwnedInternId } from "@/lib/internAuth"
import { requestInternLeave } from "@/lib/internLeave"

function identity(id = "clerk-a", status = "verified", email = "intern@example.com") {
  return { id, primaryEmailAddress: { emailAddress: email, verification: { status } } }
}
const owner = { clerkId: "clerk-a" }
const date = new Date("2099-01-01T00:00:00Z")
beforeEach(() => {
  vi.resetAllMocks()
  mocks.currentUser.mockResolvedValue(identity())
  mocks.intern.findUnique.mockResolvedValue(null)
  mocks.intern.findFirst.mockResolvedValue(null)
  mocks.intern.updateMany.mockResolvedValue({ count: 1 })
})

describe("intern invitation ownership", () => {
  it("uses the stable identity after linking even if the email changes", async () => {
    mocks.intern.findUnique.mockResolvedValue({ id: "intern-a" })
    expect(await getOwnedInternId(owner)).toBe("intern-a")
    expect(mocks.currentUser).not.toHaveBeenCalled()
    expect(mocks.intern.updateMany).not.toHaveBeenCalled()
  })
  it.each(["unverified", "expired"])("will not claim invitations with %s email ownership", async (status) => {
    mocks.currentUser.mockResolvedValue(identity("clerk-a", status))
    expect(await getOwnedInternId(owner)).toBeNull()
    expect(mocks.intern.findFirst).not.toHaveBeenCalled()
    expect(mocks.intern.updateMany).not.toHaveBeenCalled()
  })
  it("rejects mismatched Clerk/session identities", async () => {
    mocks.currentUser.mockResolvedValue(identity("clerk-b"))
    expect(await getOwnedInternId(owner)).toBeNull()
    expect(mocks.intern.findFirst).not.toHaveBeenCalled()
  })
  it("will not match an invitation already linked to a different user, even with the same email", async () => {
    const other = { id: "intern-b", clerkId: "clerk-b" }
    mocks.intern.findFirst.mockImplementation(async ({ where }) => where.clerkId === other.clerkId ? other : null)
    expect(await getOwnedInternId(owner)).toBeNull()
    expect(mocks.intern.updateMany).not.toHaveBeenCalled()
  })
  it("claims only an unlinked invitation still addressed to the verified owner", async () => {
    mocks.intern.findFirst.mockResolvedValue({ id: "intern-a" })
    expect(await getOwnedInternId(owner)).toBe("intern-a")
    expect(mocks.intern.updateMany).toHaveBeenCalledWith({
      where: { id: "intern-a", clerkId: null, email: { equals: "intern@example.com", mode: "insensitive" } },
      data: { clerkId: "clerk-a" },
    })
  })
  it("fails closed if an admin readdresses an invitation while it is being claimed", async () => {
    mocks.intern.findFirst.mockResolvedValue({ id: "intern-a" })
    mocks.intern.updateMany.mockImplementation(async ({ where }) => ({ count: where.email.equals === "replacement@example.com" ? 1 : 0 }))
    expect(await getOwnedInternId(owner)).toBeNull()
  })
  it("allows only one stable owner when two first visits race for one invitation", async () => {
    let linked: string | null = null
    mocks.currentUser.mockResolvedValueOnce(identity("clerk-a")).mockResolvedValueOnce(identity("clerk-b"))
    mocks.intern.findUnique.mockImplementation(async ({ where }) => linked === where.clerkId ? { id: "intern-a" } : null)
    mocks.intern.findFirst.mockResolvedValue({ id: "intern-a" })
    mocks.intern.updateMany.mockImplementation(async ({ where, data }) => {
      if (linked !== where.clerkId) return { count: 0 }
      linked = data.clerkId
      return { count: 1 }
    })
    const results = await Promise.all([getOwnedInternId(owner), getOwnedInternId({ clerkId: "clerk-b" })])
    expect(results).toEqual(["intern-a", null])
    expect(linked).toBe("clerk-a")
  })
  it("recovers a parallel same-owner claim without replacing another binding", async () => {
    mocks.intern.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "intern-a" })
    mocks.intern.findFirst.mockResolvedValue({ id: "intern-a" })
    mocks.intern.updateMany.mockRejectedValue({ code: "P2002" })
    expect(await getOwnedInternId(owner)).toBe("intern-a")
  })
})

describe("intern leave atomicity", () => {
  const tx = { intern: mocks.intern, internAttendance: mocks.attendance, internLeaveRequest: mocks.leave }
  beforeEach(() => {
    mocks.intern.findUnique.mockResolvedValue({ id: "intern-a", clerkId: "clerk-a", active: true, status: "active", leaveAllowance: 1 })
    mocks.attendance.findUnique.mockResolvedValue(null)
    mocks.leave.findUnique.mockResolvedValue(null)
    mocks.leave.count.mockResolvedValue(0)
    mocks.leave.create.mockImplementation(async ({ data }) => ({ id: "leave-a", ...data }))
    mocks.attendance.create.mockImplementation(async ({ data }) => ({ id: "attendance-a", ...data }))
    mocks.transaction.mockImplementation(async (callback) => callback(tx))
  })
  it("checks current owner/status and writes leave plus attendance in one serializable transaction", async () => {
    expect(await requestInternLeave("intern-a", "clerk-a", date, "Appointment")).toMatchObject({ ok: true, status: "leave" })
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" })
    expect(mocks.intern.findUnique).toHaveBeenCalledWith({ where: { id: "intern-a", clerkId: "clerk-a" } })
    expect(mocks.leave.create).toHaveBeenCalledTimes(1)
    expect(mocks.attendance.create).toHaveBeenCalledTimes(1)
  })
  it("recomputes exhausted allowance after a concurrent request wins a serialization conflict", async () => {
    mocks.transaction.mockImplementationOnce(async () => {
      mocks.leave.count.mockResolvedValue(1)
      throw { code: "P2034" }
    }).mockImplementation(async (callback) => callback(tx))
    expect(await requestInternLeave("intern-a", "clerk-a", date, null)).toMatchObject({ ok: true, status: "absent" })
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.leave.create).not.toHaveBeenCalled()
    expect(mocks.attendance.create).toHaveBeenCalledTimes(1)
  })
  it("bounds retries of known rolled-back serialization failures", async () => {
    mocks.transaction.mockRejectedValue({ code: "P2034" })
    expect(await requestInternLeave("intern-a", "clerk-a", date, null)).toMatchObject({ ok: false, httpStatus: 503 })
    expect(mocks.transaction).toHaveBeenCalledTimes(3)
  })
  it("does not automatically repeat an operation with an ambiguous database outcome", async () => {
    mocks.transaction.mockRejectedValue(new Error("connection lost containing private details"))
    expect(await requestInternLeave("intern-a", "clerk-a", date, null)).toMatchObject({ ok: false, httpStatus: 503 })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })
  it("rejects duplicate dates without writing either record", async () => {
    mocks.attendance.findUnique.mockResolvedValue({ id: "existing" })
    expect(await requestInternLeave("intern-a", "clerk-a", date, null)).toMatchObject({ ok: false, httpStatus: 400 })
    expect(mocks.leave.create).not.toHaveBeenCalled()
    expect(mocks.attendance.create).not.toHaveBeenCalled()
  })
  it("rejects a lost ownership binding or deactivated internship at the write boundary", async () => {
    for (const record of [null, { id: "intern-a", active: false }]) {
      mocks.intern.findUnique.mockResolvedValue(record)
      expect(await requestInternLeave("intern-a", "clerk-a", date, null)).toMatchObject({ ok: false, httpStatus: 403 })
    }
    expect(mocks.leave.create).not.toHaveBeenCalled()
    expect(mocks.attendance.create).not.toHaveBeenCalled()
  })
})
