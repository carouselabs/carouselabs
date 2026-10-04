import { beforeEach, describe, expect, it, vi } from "vitest"
import { Webhook } from "svix"

const mocks = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  welcome: vi.fn(), prefill: vi.fn(), referral: vi.fn(), enroll: vi.fn(),
}))
vi.mock("next/headers", () => ({ headers: async () => mocks.requestHeaders }))
vi.mock("@/lib/db", () => ({ db: { user: mocks.user } }))
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: mocks.welcome }))
vi.mock("@/lib/profile/pendingPrefill", () => ({ applyPendingPrefill: mocks.prefill }))
vi.mock("@/lib/referral", () => ({ createReferralForSignup: mocks.referral }))
vi.mock("@/lib/emailSequences", () => ({ enrollUserInMatchingSequences: mocks.enroll }))
import { POST } from "@/app/api/webhooks/clerk/route"

const secret = "whsec_" + Buffer.from("local-test-signing-secret-only-123").toString("base64")
function event(status = "verified", type = "user.created") {
  return {
    type, data: {
      id: "clerk-b", primary_email_address_id: "email-b",
      email_addresses: [{ id: "email-b", email_address: "account@example.com", verification: { status } }],
      first_name: "Test", last_name: "User", unsafe_metadata: { referralCode: "TEST" },
    },
  }
}
async function deliver(payload = event(), validSignature = true) {
  const body = JSON.stringify(payload)
  const timestamp = new Date()
  const signature = new Webhook(secret).sign("msg_local_test", timestamp, body)
  mocks.requestHeaders = new Headers({
    "svix-id": "msg_local_test", "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "svix-signature": validSignature ? signature : "v1,invalid",
  })
  return POST(new Request("https://app.test/api/webhooks/clerk", { method: "POST", body }))
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("CLERK_WEBHOOK_SECRET", secret)
  mocks.user.findUnique.mockResolvedValue(null)
  mocks.user.findFirst.mockResolvedValue(null)
  mocks.user.create.mockResolvedValue({ id: "user-b", clerkId: "clerk-b" })
})
describe("Clerk webhook identity and duplicate delivery", () => {
  it("verifies the real Svix signature before any DB effects", async () => {
    expect((await deliver(event(), false)).status).toBe(400)
    expect(mocks.user.findUnique).not.toHaveBeenCalled()
    expect(mocks.user.create).not.toHaveBeenCalled()
  })
  it("does not assign an existing user's data to a different Clerk identity", async () => {
    mocks.user.findFirst.mockResolvedValue({ id: "user-a", clerkId: "clerk-a" })
    expect((await deliver()).status).toBe(409)
    expect(mocks.user.update).not.toHaveBeenCalled()
    expect(mocks.user.create).not.toHaveBeenCalled()
    expect(mocks.welcome).not.toHaveBeenCalled()
  })
  it("waits for email verification, then provisions after user.updated", async () => {
    expect((await deliver(event("unverified"))).status).toBe(200)
    expect(mocks.user.create).not.toHaveBeenCalled()
    expect((await deliver(event("verified", "user.updated"))).status).toBe(200)
    expect(mocks.user.create).toHaveBeenCalledTimes(1)
    expect(mocks.welcome).toHaveBeenCalledTimes(1)
  })
  it("does not repeat signup effects on duplicate delivery", async () => {
    mocks.user.findUnique.mockResolvedValue({ id: "user-b", clerkId: "clerk-b" })
    expect((await deliver()).status).toBe(200)
    expect(mocks.user.create).not.toHaveBeenCalled()
    expect(mocks.welcome).not.toHaveBeenCalled()
    expect(mocks.referral).not.toHaveBeenCalled()
  })
  it("acknowledges a concurrently inserted same identity without repeating effects", async () => {
    mocks.user.create.mockRejectedValue({ code: "P2002" })
    mocks.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "user-b", clerkId: "clerk-b" })
    expect((await deliver()).status).toBe(200)
    expect(mocks.welcome).not.toHaveBeenCalled()
    expect(mocks.referral).not.toHaveBeenCalled()
  })
  it("rejects a concurrent email conflict with another identity", async () => {
    mocks.user.create.mockRejectedValue({ code: "P2002" })
    expect((await deliver()).status).toBe(409)
    expect(mocks.welcome).not.toHaveBeenCalled()
  })
})
