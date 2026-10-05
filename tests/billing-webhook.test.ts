import { beforeEach, describe, expect, it, vi } from "vitest"
import crypto from "node:crypto"

const mocks = vi.hoisted(() => ({
  db: { $transaction: vi.fn(), processedWebhookEvent: { findUnique: vi.fn() } },
  emails: { sendUpgradedToProEmail: vi.fn(), sendSubscriptionCancelledEmail: vi.fn(), sendMonthlyResetEmail: vi.fn(), sendTopUpEmail: vi.fn() },
  commission: vi.fn(),
}))
vi.mock("@/lib/db", () => ({ db: mocks.db }))
vi.mock("@/lib/email", () => mocks.emails)
vi.mock("@/lib/referral", () => ({ createCommissionForPayment: mocks.commission }))
import { POST } from "@/app/api/webhooks/lemonsqueezy/route"
import { signBillingIdentity } from "@/lib/billingIdentity"

const user = { id: "user-a", email: "account@example.test", profile: { name: "Account" } }
let sub: Record<string, unknown>
let ledger: Set<string>
let failWrite = false
let committed = false
let gate: Promise<unknown>
const copy = <T>(value: T): T => structuredClone(value)

function transactionClient() {
  return {
    processedWebhookEvent: {
      findFirst: vi.fn(async ({ where }) => [...ledger].some(id => where.eventId.in.includes(id)) ? { id: "event" } : null),
      create: vi.fn(async ({ data }) => { if (ledger.has(data.eventId)) throw { code: "P2002" }; ledger.add(data.eventId) }),
    },
    extensionSubscription: { findUnique: vi.fn(async () => null) },
    user: {
      findUnique: vi.fn(async ({ where }) => where.id === user.id || where.email === user.email ? user : null),
    },
    subscription: {
      findFirst: vi.fn(async ({ where }) => sub.lsSubscriptionId === where.lsSubscriptionId ? copy(sub) : null),
      findUnique: vi.fn(async () => copy(sub)),
      update: vi.fn(async ({ data }) => {
        if (failWrite) throw { code: "P1001" }
        for (const [key, val] of Object.entries(data)) if (val !== undefined) sub[key] = val
        return sub
      }),
      upsert: vi.fn(async ({ update }) => { if (failWrite) throw { code: "P1001" }; Object.assign(sub, update); return sub }),
    },
  }
}

beforeEach(() => {
  vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "test-secret")
  vi.stubEnv("LEMONSQUEEZY_VARIANT_ID", "11")
  vi.stubEnv("LEMONSQUEEZY_GROWTH_VARIANT_ID", "22")
  vi.stubEnv("LEMONSQUEEZY_TOPUP_VARIANT_ID", "33")
  vi.stubEnv("LEMONSQUEEZY_EXTENSION_VARIANT_ID", "44")
  sub = { userId: user.id, plan: "GROWTH", status: "ACTIVE", lsSubscriptionId: "sub-1", lsVariantId: "22", creditsUsed: 400, creditsTotal: 2000, extraCredits: 0, extraCreditsExpiry: null, currentPeriodStart: new Date("2026-08-01") }
  ledger = new Set()
  failWrite = false
  committed = false
  gate = Promise.resolve()
  mocks.commission.mockResolvedValue("no_referral")
  mocks.db.processedWebhookEvent.findUnique.mockImplementation(async ({ where }) => ledger.has(where.eventId) ? { id: "event" } : null)
  // Models transaction isolation/rollback, not a real Postgres integration.
  mocks.db.$transaction.mockImplementation((fn) => {
    const task = gate.then(async () => {
      const oldSub = copy(sub), oldLedger = new Set(ledger)
      try { const value = await fn(transactionClient()); committed = true; return value }
      catch (error) { sub = oldSub; ledger = oldLedger; throw error }
    })
    gate = task.catch(() => {})
    return task
  })
  for (const fn of Object.values(mocks.emails)) fn.mockImplementation(async () => { expect(committed).toBe(true) })
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "log").mockImplementation(() => {})
})

function request(payload: unknown, signature?: string) {
  const body = JSON.stringify(payload)
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST", body,
    headers: { "x-signature": signature ?? crypto.createHmac("sha256", "test-secret").update(body).digest("hex") },
  })
}
function invoice(id = "invoice-1", attrs = {}) {
  return { meta: { event_name: "subscription_payment_success" }, data: { type: "subscription-invoices", id, attributes: { subscription_id: "sub-1", billing_reason: "renewal", created_at: "2026-09-01T00:00:00Z", status: "paid", ...attrs } } }
}
function topup(attrs = {}, custom = {}) {
  return { meta: { event_name: "order_created", custom_data: { user_id: user.id, identity_signature: signBillingIdentity(user.id, "33"), ...custom } }, data: { type: "orders", id: "order-1", attributes: { first_order_item: { variant_id: 33 }, status: "paid", subtotal_usd: 1000, discount_total_usd: 0, ...attrs } } }
}

describe("Lemon Squeezy billing boundaries (mocked database)", () => {
  it("rejects bad signatures before DB access", async () => {
    expect((await POST(request(invoice(), "bad"))).status).toBe(401)
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
  })
  it("rejects malformed signed JSON objects", async () => {
    expect((await POST(request({}))).status).toBe(400)
    expect(mocks.db.$transaction).not.toHaveBeenCalled()
  })
  it("uses the stored Growth variant for an invoice without variant_id", async () => {
    expect((await POST(request(invoice()))).status).toBe(200)
    expect(sub).toMatchObject({ plan: "GROWTH", creditsTotal: 2000, creditsUsed: 0 })
    expect(mocks.emails.sendMonthlyResetEmail).toHaveBeenCalledOnce()
  })
  it("ignores editable email on existing subscription invoices", async () => {
    expect((await POST(request(invoice("invoice-1", { user_email: "other@example.test" })))).status).toBe(200)
    expect(sub.userId).toBe(user.id)
  })
  it("commits a concurrent repeated invoice exactly once", async () => {
    const responses = await Promise.all([POST(request(invoice())), POST(request(invoice()))])
    expect(responses.map(r => r.status)).toEqual([200, 200])
    expect(mocks.emails.sendMonthlyResetEmail).toHaveBeenCalledOnce()
    expect(ledger.size).toBe(1)
  })
  it("does not reuse webhook configuration IDs as delivery IDs", async () => {
    const first = { ...invoice(), meta: { event_name: "subscription_payment_success", webhook_id: "configuration-1" } }
    const second = { ...invoice("invoice-2", { created_at: "2026-10-01T00:00:00Z" }), meta: first.meta }
    await POST(request(first))
    expect((await POST(request(second))).status).toBe(200)
    expect(ledger.size).toBe(2)
  })
  it("rolls back the event claim on DB failure and allows provider retry", async () => {
    failWrite = true
    expect((await POST(request(invoice()))).status).toBe(503)
    expect(ledger.size).toBe(0)
    expect(mocks.emails.sendMonthlyResetEmail).not.toHaveBeenCalled()
    failWrite = false
    expect((await POST(request(invoice()))).status).toBe(200)
  })
  it("returns retryable failure for an unavailable database rather than acknowledging payment", async () => {
    mocks.db.$transaction.mockRejectedValueOnce({ code: "P1001" })
    expect((await POST(request(invoice()))).status).toBe(503)
  })
  it("does not reset allowance twice for the initial invoice", async () => {
    expect((await POST(request(invoice("initial", { billing_reason: "initial" })))).status).toBe(200)
    expect(sub.creditsUsed).toBe(400)
  })
  it("does not reset allowance for an older invoice arriving late", async () => {
    sub.currentPeriodStart = new Date("2026-10-01")
    expect((await POST(request(invoice()))).status).toBe(200)
    expect(sub.creditsUsed).toBe(400)
  })
  it("does not revive an expired subscription from a delayed historical invoice", async () => {
    Object.assign(sub, { plan: "FREE", status: "EXPIRED", currentPeriodStart: new Date("2026-10-01") })
    expect((await POST(request(invoice()))).status).toBe(200)
    expect(sub).toMatchObject({ plan: "FREE", status: "EXPIRED", creditsUsed: 400 })
  })
  it("rejects an unsigned new web subscription instead of trusting checkout email", async () => {
    const payload = { meta: { event_name: "subscription_created" }, data: { type: "subscriptions", id: "unbound", attributes: { variant_id: 11, user_email: user.email, status: "active" } } }
    expect((await POST(request(payload))).status).toBe(503)
    expect(sub.lsSubscriptionId).toBe("sub-1")
    expect(ledger.size).toBe(0)
  })
  it("rolls back an unsigned extension checkout rather than accepting arbitrary user IDs", async () => {
    const payload = { meta: { event_name: "subscription_created", custom_data: { user_id: user.id } }, data: { type: "subscriptions", id: "extension-1", attributes: { variant_id: 44, status: "active" } } }
    expect((await POST(request(payload))).status).toBe(503)
    expect(ledger.size).toBe(0)
  })
  it("does not map unknown products to Pro", async () => {
    sub.lsVariantId = "999"
    expect((await POST(request(invoice()))).status).toBe(503)
    expect(sub.creditsUsed).toBe(400)
  })
  it("grants topups from the paid USD amount after discounts, ignoring requested credits", async () => {
    expect((await POST(request(topup({ subtotal_usd: 1000, discount_total_usd: 800 }, { credits: 5000 })))).status).toBe(200)
    expect(sub.extraCredits).toBe(100)
  })
  it("does not resurrect expired extras on a new topup", async () => {
    sub.extraCredits = 1000; sub.extraCreditsExpiry = new Date("2020-01-01")
    expect((await POST(request(topup()))).status).toBe(200)
    expect(sub.extraCredits).toBe(500)
  })
  it("rejects a copied checkout identity for another account", async () => {
    expect((await POST(request(topup({}, { user_id: "user-b" })))).status).toBe(503)
    expect(sub.extraCredits).toBe(0)
  })
  it("rejects unpaid orders and fractional topup prices", async () => {
    expect((await POST(request(topup({ status: "pending" })))).status).toBe(503)
    expect((await POST(request(topup({ subtotal_usd: 250 })))).status).toBe(503)
    expect(sub.extraCredits).toBe(0)
  })
  it("does not let a custom kind marker turn a web plan into an extension", async () => {
    const payload = { meta: { event_name: "subscription_created", custom_data: { kind: "extension", user_id: user.id, identity_signature: signBillingIdentity(user.id, "11") } }, data: { type: "subscriptions", id: "new-sub", attributes: { variant_id: 11, status: "active" } } }
    expect((await POST(request(payload))).status).toBe(200)
    expect(sub.plan).toBe("PRO")
  })
})
