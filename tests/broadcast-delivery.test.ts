// Admin email broadcasts reach everyone they're meant for: sent through
// Resend's batch endpoint (100 per request, paced, retried when Resend says
// "too fast", stopped on a quota with the reason kept), personalized one
// batch at a time with one query per batch. And the two Engage audiences
// (LinkedIn users, X users) pick the same people as the admin's Engage list.
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  ensureReferralCode: vi.fn(),
}))
vi.mock("@/lib/db", () => ({ db: { user: { findMany: mocks.findMany, count: mocks.count } } }))
vi.mock("@/lib/referral", () => ({
  ensureReferralCode: mocks.ensureReferralCode,
  getSiteOrigin: async () => "https://carouselabs.com",
}))

import { chunk, sendInBatches, type OutgoingEmail } from "@/lib/emailBatchSend"
import { resolveRecipients, sendUserBroadcast } from "@/lib/broadcast"
import { matchesSegment } from "@/lib/emailSequences"
import { SEGMENT_TYPES } from "@/lib/segments"
import type { Resend } from "resend"

type BatchCall = { emails: { to: string; subject: string; html: string; from: string }[]; options: Record<string, unknown> }

// A Resend client whose batch endpoint answers from a script, one answer per
// request (then success), and records every request.
function fakeResend(answers: Array<{ error?: { name: string; message: string }; errors?: { index: number; message: string }[] }> = []) {
  const calls: BatchCall[] = []
  const send = vi.fn(async (emails: BatchCall["emails"], options: Record<string, unknown>) => {
    calls.push({ emails, options })
    const answer = answers.shift() ?? {}
    if (answer.error) return { data: null, error: { ...answer.error, statusCode: 429 } }
    return { data: { data: emails.map((_, i) => ({ id: `id-${calls.length}-${i}` })), errors: answer.errors }, error: null }
  })
  return { resend: { batch: { send } } as unknown as Resend, calls, send }
}

const people = (n: number) => Array.from({ length: n }, (_, i) => `person${i}@example.test`)
const asEmails = async (batch: string[]): Promise<OutgoingEmail[]> => batch.map((to) => ({ to, subject: "Hi", html: "<p>Hi</p>" }))
const noWait = { sleepFn: async () => {} }

describe("sending in batches", () => {
  it("sends 250 emails as 100 + 100 + 50, to everyone, not just the first few", async () => {
    const { resend, calls } = fakeResend()
    const result = await sendInBatches(resend, "CarouseLabs <support@carouselabs.com>", people(250), asEmails, noWait)
    expect(calls.map((c) => c.emails.length)).toEqual([100, 100, 50])
    expect(result).toEqual({ sent: 250, failed: 0, failedTo: [] })
    expect(new Set(calls.flatMap((c) => c.emails.map((e) => e.to))).size).toBe(250)
  })

  it("waits and tries again when Resend says too fast, with the same key so nothing goes twice", async () => {
    const { resend, calls } = fakeResend([{ error: { name: "rate_limit_exceeded", message: "Too many requests" } }])
    const waits: number[] = []
    const result = await sendInBatches(resend, "from", people(120), asEmails, {
      idempotencyPrefix: "broadcast-1",
      sleepFn: async (ms) => void waits.push(ms),
    })
    expect(result).toEqual({ sent: 120, failed: 0, failedTo: [] })
    expect(calls.map((c) => c.options.idempotencyKey)).toEqual(["broadcast-1-0", "broadcast-1-0", "broadcast-1-1"])
    expect(waits.some((ms) => ms >= 1000)).toBe(true) // backed off before the retry
  })

  it("spaces requests out to stay under Resend's rate limit", async () => {
    const { resend } = fakeResend()
    const waits: number[] = []
    await sendInBatches(resend, "from", people(300), asEmails, { sleepFn: async (ms) => void waits.push(ms) })
    expect(waits.length).toBe(2) // before the 2nd and 3rd request
    expect(waits.every((ms) => ms > 0 && ms <= 600)).toBe(true)
  })

  it("one bad address doesn't stop the other 99, and is reported", async () => {
    const { resend, calls } = fakeResend([{ errors: [{ index: 3, message: "Invalid `to` field" }] }])
    const result = await sendInBatches(resend, "from", people(100), asEmails, noWait)
    expect(calls[0].options.batchValidation).toBe("permissive")
    expect(result).toEqual({ sent: 99, failed: 1, failedTo: ["person3@example.test"], error: "Invalid `to` field" })
  })

  it("stops at Resend's quota and says so, rather than hammering on", async () => {
    const { resend, calls } = fakeResend([{}, { error: { name: "daily_quota_exceeded", message: "You have reached your daily email sending quota." } }])
    const result = await sendInBatches(resend, "from", people(350), asEmails, noWait)
    expect(calls.length).toBe(2)
    expect(result.sent).toBe(100)
    expect(result.failed).toBe(250)
    expect(result.error).toBe("Resend: You have reached your daily email sending quota.")
  })

  it("a batch whose emails couldn't be made counts as failed, and the rest still go", async () => {
    const { resend } = fakeResend()
    let first = true
    const result = await sendInBatches(resend, "from", people(150), async (batch) => {
      if (first) {
        first = false
        throw new Error("database down")
      }
      return asEmails(batch)
    }, noWait)
    expect(result.sent).toBe(50)
    expect(result.failed).toBe(100)
  })

  it("chunks into hundreds", () => {
    expect(chunk(people(201)).map((c) => c.length)).toEqual([100, 100, 1])
    expect(chunk([])).toEqual([])
  })
})

describe("a user broadcast", () => {
  beforeEach(() => {
    mocks.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => ({
        id,
        email: `${id}@example.test`,
        referralCode: `REF${id}`,
        createdAt: new Date(),
        profile: { name: `Name${id} Last` },
        subscription: null,
      })),
    )
  })

  it("personalizes each email, looking people up once per batch of 100, not once each", async () => {
    const { resend, calls } = fakeResend()
    const recipients = Array.from({ length: 230 }, (_, i) => ({ userId: `u${i}`, email: `u${i}@example.test` }))
    const result = await sendUserBroadcast(resend, "from", recipients, "Hi {{firstName}}", "Your code {{referralCode}}", "b1")
    expect(result.sent).toBe(230)
    expect(mocks.findMany).toHaveBeenCalledTimes(3)
    const first = calls[0].emails[0]
    expect(first.subject).toBe("Hi Nameu0")
    expect(first.html).toContain("REFu0")
  })

  it("an address with no account gets the template as written", async () => {
    const { resend, calls } = fakeResend()
    await sendUserBroadcast(resend, "from", [{ userId: null, email: "someone@example.test" }], "Hi {{firstName}}", "Body", "b2")
    expect(calls[0].emails[0].subject).toBe("Hi {{firstName}}")
  })
})

describe("the Engage audiences", () => {
  it("are offered wherever audiences are (broadcasts, scheduled emails, sequences)", () => {
    expect(SEGMENT_TYPES.map((s) => [s.value, s.label])).toEqual(
      expect.arrayContaining([
        ["engage_linkedin", "CarouseLabs Engage for LinkedIn users"],
        ["engage_x", "CarouseLabs Engage for X users"],
      ]),
    )
  })

  it("X users: signed in to the X extension or wrote X replies/messages", async () => {
    mocks.findMany.mockResolvedValue([{ id: "x1", email: "x1@example.test" }])
    expect(await resolveRecipients("engage_x")).toEqual([{ userId: "x1", email: "x1@example.test" }])
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      deletedAt: null,
      OR: [
        { extensionTokens: { some: { device: { startsWith: "X extension" } } } },
        { commentHistory: { some: { kind: { in: ["x_reply", "x_message"] } } } },
      ],
    })
  })

  it("LinkedIn users: any other sign-in (including unlabelled ones), or LinkedIn comments, replies, notes, messages", async () => {
    mocks.findMany.mockResolvedValue([])
    await resolveRecipients("engage_linkedin")
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({
      deletedAt: null,
      OR: [
        { extensionTokens: { some: { OR: [{ device: null }, { NOT: { device: { startsWith: "X extension" } } }] } } },
        { commentHistory: { some: { kind: { in: ["comment", "reply", "connection_note", "message"] } } } },
      ],
    })
  })

  it("sequences can enroll by them too", async () => {
    mocks.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    const user = { id: "u1", deletedAt: null, updatedAt: new Date() }
    expect(await matchesSegment(user, null, "engage_x", null)).toBe(true)
    expect(await matchesSegment(user, null, "engage_linkedin", null)).toBe(false)
    expect(mocks.count.mock.calls[0][0].where).toMatchObject({ id: "u1", OR: expect.any(Array) })
  })
})
