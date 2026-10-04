import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ subscription: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { extensionSubscription: { findUnique: mocks.subscription } } }))
import { extensionCheckoutFor } from "@/lib/extensionCheckout"
import { verifyBillingIdentity } from "@/lib/billingIdentity"

beforeEach(() => {
  mocks.subscription.mockResolvedValue(null)
  vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "test-only-secret")
  vi.stubEnv("LEMONSQUEEZY_EXTENSION_VARIANT_ID", "44")
  vi.stubEnv("LEMONSQUEEZY_EXTENSION_CHECKOUT_URL", "https://store.lemonsqueezy.com/buy/extension")
})
describe("extension checkout identity", () => {
  it("binds the authenticated account and configured extension variant", async () => {
    const result = await extensionCheckoutFor({ id: "a", email: "a@example.test" })
    expect(result.kind).toBe("checkout")
    if (result.kind !== "checkout") throw new Error("Expected checkout")
    const url = new URL(result.url)
    const signature = url.searchParams.get("checkout[custom][identity_signature]")
    expect(verifyBillingIdentity("a", "44", signature)).toBe(true)
    expect(verifyBillingIdentity("b", "44", signature)).toBe(false)
    expect(verifyBillingIdentity("a", "11", signature)).toBe(false)
  })
  it.each(["not-a-url", "http://store.lemonsqueezy.com/buy/extension"])("fails safely for %s", async value => {
    vi.stubEnv("LEMONSQUEEZY_EXTENSION_CHECKOUT_URL", value)
    expect(await extensionCheckoutFor({ id: "a", email: "a@example.test" })).toEqual({ kind: "unavailable" })
  })
  it("avoids a second paid subscription", async () => {
    mocks.subscription.mockResolvedValue({ status: "active", endsAt: null, customerPortalUrl: "https://store.example.test/portal" })
    expect(await extensionCheckoutFor({ id: "a", email: "a@example.test" })).toMatchObject({ kind: "subscribed" })
  })
})
