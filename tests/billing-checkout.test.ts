import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ user: vi.fn() }))
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }))
import { POST } from "@/app/api/billing/checkout/route"
import { verifyBillingIdentity } from "@/lib/billingIdentity"

beforeEach(() => {
  mocks.user.mockResolvedValue({ id: "user-a", email: "a@example.test", subscription: { plan: "PRO", lsSubscriptionId: "sub-a" } })
  vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "test-secret")
  vi.stubEnv("LEMONSQUEEZY_TOPUP_VARIANT_ID", "33")
  vi.stubEnv("LEMONSQUEEZY_VARIANT_ID", "11")
  vi.stubEnv("NEXT_PUBLIC_LEMONSQUEEZY_TOPUP_CHECKOUT_URL", "https://store.lemonsqueezy.com/buy/topup")
  vi.stubEnv("NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL", "https://store.lemonsqueezy.com/buy/pro")
})
const request = (body: unknown) => new Request("https://app.example.test/api/billing/checkout", { method: "POST", body: JSON.stringify(body) })
describe("authenticated billing checkout", () => {
  it("rejects anonymous checkout requests", async () => {
    mocks.user.mockResolvedValue(null)
    expect((await POST(request({ kind: "pro" }))).status).toBe(401)
  })
  it("derives identity from the session, signs the configured product and sets the correct price", async () => {
    const response = await POST(request({ kind: "topup", credits: 500, userId: "user-b", price: 1 }))
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const url = new URL((await response.json()).url)
    expect(url.searchParams.get("checkout[custom][user_id]")).toBe("user-a")
    expect(url.searchParams.get("checkout[suggested_price]")).toBe("1000")
    const signature = url.searchParams.get("checkout[custom][identity_signature]")
    expect(verifyBillingIdentity("user-a", "33", signature)).toBe(true)
    expect(verifyBillingIdentity("user-b", "33", signature)).toBe(false)
    expect(verifyBillingIdentity("user-a", "11", signature)).toBe(false)
  })
  it.each([0, 1, 99, 101, 5001, -100, 100.5])("rejects invalid topup amount %s", async credits => {
    expect((await POST(request({ kind: "topup", credits }))).status).toBe(400)
  })
  it("rejects topups for free accounts and duplicate active subscriptions", async () => {
    expect((await POST(request({ kind: "pro" }))).status).toBe(409)
    mocks.user.mockResolvedValue({ id: "user-a", email: "a@example.test", subscription: { plan: "FREE" } })
    expect((await POST(request({ kind: "topup", credits: 100 }))).status).toBe(403)
    expect((await POST(request({ kind: "pro" }))).status).toBe(200)
  })
  it.each(["not-a-url", "http://store.example.test/buy/topup"])("returns a safe configuration error for %s", async base => {
    vi.stubEnv("NEXT_PUBLIC_LEMONSQUEEZY_TOPUP_CHECKOUT_URL", base)
    expect((await POST(request({ kind: "topup", credits: 100 }))).status).toBe(503)
  })
})
