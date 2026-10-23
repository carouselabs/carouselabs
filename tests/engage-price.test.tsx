// @vitest-environment jsdom
// Special prices for an Engage extension: an admin sets one person's price
// (e.g. $5 instead of $15), their checkout charges it as their own discount
// from the usual price, and they see it with the usual price struck through.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

type Row = {
  id: string; userId: string; platform: string; priceCents: number; endsAt: Date | null; reason: string; setBy: string; createdAt: Date; updatedAt: Date
  lemonDiscountId?: string | null; lemonDiscountCode?: string | null; lemonDiscountCents?: number | null
  introMonths?: number | null; introUsedAt?: Date | null
}

// Prisma's where for one field: a value, or { not: value }; unset counts as null.
const matches = (value: unknown, want: unknown) =>
  want !== null && typeof want === "object" && "not" in want ? (value ?? null) !== (want as { not: unknown }).not : (value ?? null) === want

const mocks = vi.hoisted(() => ({
  rows: [] as Row[],
  audit: [] as Record<string, unknown>[],
  gate: vi.fn(),
  subscription: vi.fn(),
  xSubscription: vi.fn(),
  redditSubscription: vi.fn(),
  trialUpdate: vi.fn(),
}))

vi.mock("@/lib/db", () => {
  const key = (w: { userId_platform: { userId: string; platform: string } }) => (r: Row) =>
    r.userId === w.userId_platform.userId && r.platform === w.userId_platform.platform
  return {
    db: {
      engagePrice: {
        findMany: vi.fn(async ({ where }: { where: { userId: string } }) => mocks.rows.filter((r) => r.userId === where.userId)),
        findUnique: vi.fn(async ({ where }: { where: { userId_platform: { userId: string; platform: string } } }) => {
          // A copy, as Prisma returns.
          const row = mocks.rows.find(key(where))
          return row ? { ...row } : null
        }),
        upsert: vi.fn(async ({ where, create, update }: { where: { userId_platform: { userId: string; platform: string } }; create: Omit<Row, "id" | "createdAt" | "updatedAt">; update: Partial<Row> }) => {
          const found = mocks.rows.find(key(where))
          if (found) return Object.assign(found, update, { updatedAt: new Date() })
          const row = { id: `p${mocks.rows.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...create } as Row
          mocks.rows.push(row)
          return row
        }),
        updateMany: vi.fn(async ({ where, data }: { where: Partial<Row>; data: Partial<Row> }) => {
          const hits = mocks.rows.filter((r) => Object.entries(where).every(([k, v]) => matches(r[k as keyof Row], v)))
          hits.forEach((r) => Object.assign(r, data))
          return { count: hits.length }
        }),
        delete: vi.fn(async ({ where }: { where: { userId_platform: { userId: string; platform: string } } }) => {
          mocks.rows = mocks.rows.filter((r) => !key(where)(r))
        }),
      },
      auditLog: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => mocks.audit.push(data)) },
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          where.id === "u1" ? { id: "u1", email: "priya@example.com", deletedAt: null } : null,
        ),
        updateMany: mocks.trialUpdate,
      },
      extensionSubscription: { findUnique: mocks.subscription },
      xSubscription: { findUnique: mocks.xSubscription },
      redditSubscription: { findUnique: mocks.redditSubscription },
    },
  }
})
vi.mock("@/lib/engage/adminAccess", () => ({ requireEngagePermission: mocks.gate }))

import { formatUsd, offerLabel, parseDollars, priceFor, shortPriceLabel, standardPrice } from "@/lib/engage/priceRules"
import { markIntroUsed } from "@/lib/engage/priceIntro"
import { extensionCheckoutFor, checkoutExpiry } from "@/lib/extensionCheckout"
import { verifyBillingIdentity } from "@/lib/billingIdentity"
import { reserveFreeGeneration } from "@/lib/extAccess"
import { GET, PUT, DELETE } from "@/app/api/admin/engage/users/[userId]/price/route"
import { EngagePriceCard } from "@/components/admin/engage/EngagePriceCard"
import { ExtensionPlanSection } from "@/components/extension/ExtensionPlanSection"
import type { ExtAccessSummary } from "@/lib/extAccess"

const NOW = new Date("2026-10-21T10:00:00.000Z")
const special = (priceCents: number, endsAt: Date | null = null, platform = "linkedin"): Row => ({
  id: `p-${platform}`, userId: "u1", platform, priceCents, endsAt, reason: "Early supporter", setBy: "admin@carouselabs.com",
  createdAt: NOW, updatedAt: NOW,
})

beforeEach(() => {
  mocks.rows = []
  mocks.audit = []
  mocks.gate.mockReset()
  mocks.gate.mockResolvedValue({ ok: true, admin: { email: "admin@carouselabs.com" } })
  mocks.subscription.mockResolvedValue(null)
  mocks.xSubscription.mockResolvedValue(null)
  mocks.redditSubscription.mockResolvedValue(null)
  mocks.trialUpdate.mockResolvedValue({ count: 0 })
  vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "test-only-secret")
  vi.stubEnv("LEMONSQUEEZY_EXTENSION_VARIANT_ID", "44")
  vi.stubEnv("LEMONSQUEEZY_EXTENSION_CHECKOUT_URL", "https://store.lemonsqueezy.com/buy/extension")
  vi.stubEnv("LEMONSQUEEZY_STORE_ID", "7")
  vi.stubEnv("LEMONSQUEEZY_API_KEY", "test-only-key")
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("the price rules", () => {
  it("is the usual $15 unless a special price is set and still open", () => {
    expect(priceFor("linkedin", null, NOW)).toEqual({ cents: 1500, standardCents: 1500, special: false, endsAt: null, introMonths: null })
    expect(priceFor("linkedin", { priceCents: 500, endsAt: null }, NOW)).toEqual({ cents: 500, standardCents: 1500, special: true, endsAt: null, introMonths: null })
    const ends = new Date("2026-11-30T23:59:59.000Z")
    expect(priceFor("x", { priceCents: 500, endsAt: ends }, NOW)).toMatchObject({ cents: 500, special: true, endsAt: ends.toISOString() })
    // Its last day has passed: the usual price again.
    expect(priceFor("linkedin", { priceCents: 500, endsAt: new Date("2026-10-20T23:59:59.000Z") }, NOW)).toEqual(standardPrice("linkedin"))
    // The usual price set as "special" is no special price.
    expect(priceFor("linkedin", { priceCents: 1500, endsAt: null }, NOW).special).toBe(false)
  })

  it("an intro offer: cheaper than the usual price, until they've bought with it", () => {
    const intro = (over = {}) => ({ priceCents: 100, endsAt: null, introMonths: 3, introUsedAt: null, ...over })
    expect(priceFor("linkedin", intro(), NOW)).toEqual({ cents: 100, standardCents: 1500, special: true, endsAt: null, introMonths: 3 })
    expect(priceFor("linkedin", intro({ introUsedAt: NOW }), NOW)).toEqual(standardPrice("linkedin"))
    expect(priceFor("linkedin", intro({ priceCents: 1500 }), NOW).special).toBe(false)
    expect(priceFor("linkedin", intro({ priceCents: 2000 }), NOW).special).toBe(false)
    expect(priceFor("linkedin", intro({ endsAt: new Date("2026-10-01T00:00:00.000Z") }), NOW).special).toBe(false)
  })

  it("says an offer in words", () => {
    const every = priceFor("linkedin", { priceCents: 500, endsAt: null }, NOW)
    const first = priceFor("linkedin", { priceCents: 100, endsAt: null, introMonths: 1 }, NOW)
    const three = priceFor("linkedin", { priceCents: 100, endsAt: null, introMonths: 3 }, NOW)
    expect([shortPriceLabel(every), shortPriceLabel(first), shortPriceLabel(three)]).toEqual(["$5/month", "$1 first month", "$1/month for 3 months"])
    expect(offerLabel(every)).toBe("$5/month")
    expect(offerLabel(first)).toBe("$1 for your first month, then $15/month")
    expect(offerLabel(three)).toBe("$1/month for your first 3 months, then $15/month")
  })

  it("reads dollars the way an admin types them", () => {
    expect(parseDollars("5")).toBe(500)
    expect(parseDollars("$5")).toBe(500)
    expect(parseDollars("4.99")).toBe(499)
    expect(parseDollars("4.9")).toBe(490)
    expect(parseDollars(" 12 ")).toBe(1200)
    for (const bad of ["", "abc", "-5", "5.999", "5,00", "1e3"]) expect(parseDollars(bad)).toBeNull()
    expect(formatUsd(500)).toBe("$5")
    expect(formatUsd(499)).toBe("$4.99")
  })
})

describe("checkout", () => {
  // A small Lemon Squeezy: the product's price, discounts made and deleted,
  // which were redeemed, and the checkouts made.
  type Made = { id: string; attributes: Record<string, unknown>; relationships: Record<string, { data: unknown }> }
  type Checkout = { attributes: Record<string, any>; relationships: unknown } // eslint-disable-line @typescript-eslint/no-explicit-any
  function fakeLemon(over: Partial<{ variantPrice: number; refuse: string[] }> = {}) {
    const state = {
      variantPrice: over.variantPrice ?? 1500,
      refuse: new Set(over.refuse ?? []),
      redeemed: new Set<string>(),
      made: [] as Made[],
      deleted: [] as string[],
      checkouts: [] as Checkout[],
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const path = url.replace("https://api.lemonsqueezy.com/v1/", "")
        const method = init?.method ?? "GET"
        const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
        if (method === "GET" && path.startsWith("variants/")) return json({ data: { attributes: { price: state.variantPrice } } })
        if (method === "GET" && path.startsWith("discount-redemptions")) {
          const id = new URL(`https://x/${path}`).searchParams.get("filter[discount_id]") ?? ""
          return json({ data: state.redeemed.has(id) ? [{ id: "r1" }] : [] })
        }
        if (method === "POST" && path === "discounts") {
          if (state.refuse.has("discount")) return json({ errors: [{ detail: "nope" }] }, 422)
          const made = { id: `d${state.made.length + 1}`, ...JSON.parse(String(init?.body)).data }
          state.made.push(made)
          return json({ data: { id: made.id } }, 201)
        }
        if (method === "DELETE" && path.startsWith("discounts/")) {
          state.deleted.push(path.split("/")[1])
          return new Response(null, { status: 204 })
        }
        if (method === "POST" && path === "checkouts") {
          if (state.refuse.has("checkout")) return json({ errors: [{ detail: "nope" }] }, 422)
          state.checkouts.push(JSON.parse(String(init?.body)).data)
          return json({ data: { attributes: { url: "https://carouselabs.lemonsqueezy.com/checkout/custom/abc" } } }, 201)
        }
        return json({ error: `unexpected ${method} ${path}` }, 500)
      }),
    )
    return state
  }
  const buy = () => extensionCheckoutFor({ id: "u1", email: "priya@example.com" })

  it("charges a special price as the person's own once-only discount, shown as such", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    mocks.rows = [special(500, new Date("2026-10-22T05:00:00.000Z"))]
    const lemon = fakeLemon()

    expect(await buy()).toEqual({ kind: "checkout", url: "https://carouselabs.lemonsqueezy.com/checkout/custom/abc" })

    // $15 product, $5 special price: $10 off every payment, usable once, only on this extension.
    const [discount] = lemon.made
    expect(discount.attributes).toEqual({
      name: "Special price, Engage for LinkedIn",
      code: expect.stringMatching(/^CLL[A-Z2-9]{10}$/),
      amount: 1000,
      amount_type: "fixed",
      duration: "forever",
      is_limited_to_products: true,
      is_limited_redemptions: true,
      max_redemptions: 1,
    })
    expect(discount.relationships).toEqual({
      store: { data: { type: "stores", id: "7" } },
      variants: { data: [{ type: "variants", id: "44" }] },
    })
    expect(mocks.rows[0]).toMatchObject({ lemonDiscountId: "d1", lemonDiscountCode: discount.attributes.code, lemonDiscountCents: 1000 })

    const [checkout] = lemon.checkouts
    expect(checkout.attributes.checkout_data.discount_code).toBe(discount.attributes.code)
    expect(checkout.attributes.custom_price).toBeUndefined()
    expect(checkout.attributes.product_options.enabled_variants).toEqual([44])
    expect(checkout.attributes.checkout_data.email).toBe("priya@example.com")
    expect(checkout.relationships).toEqual({ store: { data: { type: "stores", id: "7" } }, variant: { data: { type: "variants", id: "44" } } })
    // Bound to this account, exactly like the usual checkout.
    const custom = checkout.attributes.checkout_data.custom
    expect(custom.user_id).toBe("u1")
    expect(verifyBillingIdentity("u1", "44", custom.identity_signature)).toBe(true)
    // The special price ends in less than a day, so the checkout does too.
    expect(checkout.attributes.expires_at).toBe("2026-10-22T05:00:00.000Z")
  })

  it("reuses the code while it's unused; a used one is replaced but never deleted", async () => {
    mocks.rows = [special(500)]
    const lemon = fakeLemon()
    await buy()
    await buy()
    expect(lemon.made).toHaveLength(1)
    expect(lemon.checkouts.map((c) => c.attributes.checkout_data.discount_code)).toEqual([
      lemon.made[0].attributes.code,
      lemon.made[0].attributes.code,
    ])

    lemon.redeemed.add("d1")
    await buy()
    expect(lemon.made).toHaveLength(2)
    expect(lemon.checkouts[2].attributes.checkout_data.discount_code).toBe(lemon.made[1].attributes.code)
    expect(lemon.deleted).toEqual([])
  })

  it("makes a new code when the product's price changed, deleting the unused old one", async () => {
    mocks.rows = [{ ...special(500), lemonDiscountId: "d9", lemonDiscountCode: "CLLOLDOLDOLD1", lemonDiscountCents: 1000 }]
    const lemon = fakeLemon({ variantPrice: 2000 })
    await buy()
    expect(lemon.deleted).toEqual(["d9"])
    expect(lemon.made[0].attributes.amount).toBe(1500)
    expect(lemon.checkouts[0].attributes.checkout_data.discount_code).toBe(lemon.made[0].attributes.code)
  })

  it("charges the special price as a custom price when there's nothing to discount or no discount can be made", async () => {
    mocks.rows = [special(500)]
    // The product costs less than the special price (as X's does at $0.50).
    let lemon = fakeLemon({ variantPrice: 50 })
    await buy()
    expect(lemon.made).toEqual([])
    expect(lemon.checkouts[0].attributes).toMatchObject({ custom_price: 500, checkout_data: { email: "priya@example.com" } })
    expect(lemon.checkouts[0].attributes.checkout_data.discount_code).toBeUndefined()

    lemon = fakeLemon({ refuse: ["discount"] })
    expect((await buy()).kind).toBe("checkout")
    expect(lemon.checkouts[0].attributes.custom_price).toBe(500)
  })

  it("never falls back to the usual-price link when Lemon Squeezy says no", async () => {
    mocks.rows = [special(500)]
    fakeLemon({ refuse: ["checkout"] })
    expect(await buy()).toEqual({ kind: "unavailable" })
    vi.stubEnv("LEMONSQUEEZY_STORE_ID", "")
    expect(await buy()).toEqual({ kind: "unavailable" })
  })

  it("keeps the usual shared link for everyone else, and for an ended special price", async () => {
    const lemon = fakeLemon()
    mocks.rows = [special(500, new Date("2026-10-01T23:59:59.000Z")), special(700, null, "x")]
    const result = await buy()
    expect(result.kind === "checkout" && result.url.startsWith("https://store.lemonsqueezy.com/buy/extension?")).toBe(true)
    expect(lemon.made).toEqual([])
    expect(lemon.checkouts).toEqual([])
  })

  it("an admin's new amount or removal retires the unused discount, never a used one", async () => {
    const lemon = fakeLemon()
    const req = (method: string, body: unknown) =>
      new Request("https://admin.test/api/admin/engage/users/u1/price", { method, body: JSON.stringify(body) })
    const params = { params: Promise.resolve({ userId: "u1" }) }
    mocks.rows = [{ ...special(500), lemonDiscountId: "d1", lemonDiscountCode: "CLLAAAAAAAAAA", lemonDiscountCents: 1000 }]

    // Same amount, new end date: the discount stays.
    await PUT(req("PUT", { platform: "linkedin", priceCents: 500, endsAt: "2099-01-01T23:59:59.000Z", reason: "Longer" }), params)
    expect(mocks.rows[0].lemonDiscountId).toBe("d1")
    expect(lemon.deleted).toEqual([])

    // A new amount: forgotten here, deleted there (nobody used it).
    await PUT(req("PUT", { platform: "linkedin", priceCents: 300, reason: "Cheaper" }), params)
    expect(mocks.rows[0]).toMatchObject({ priceCents: 300, lemonDiscountId: null, lemonDiscountCode: null, lemonDiscountCents: null })
    expect(lemon.deleted).toEqual(["d1"])

    // Removed while its discount was used: the discount stays in Lemon Squeezy.
    Object.assign(mocks.rows[0], { lemonDiscountId: "d2", lemonDiscountCode: "CLLBBBBBBBBBB", lemonDiscountCents: 1200 })
    lemon.redeemed.add("d2")
    await DELETE(req("DELETE", { platform: "linkedin", reason: "Back to normal" }), params)
    expect(mocks.rows).toEqual([])
    expect(lemon.deleted).toEqual(["d1"])

    // Removed while nobody had used its discount: deleted there too.
    mocks.rows = [{ ...special(500), lemonDiscountId: "d3", lemonDiscountCode: "CLLCCCCCCCCCC", lemonDiscountCents: 1000 }]
    await DELETE(req("DELETE", { platform: "linkedin", reason: "Not needed" }), params)
    expect(lemon.deleted).toEqual(["d1", "d3"])
  })

  it("an intro offer: a discount for its months only, then Lemon Squeezy charges the usual price", async () => {
    mocks.rows = [{ ...special(100), introMonths: 3 }]
    const lemon = fakeLemon()
    expect((await buy()).kind).toBe("checkout")
    expect(lemon.made[0].attributes).toMatchObject({ amount: 1400, duration: "repeating", duration_in_months: 3, max_redemptions: 1 })
    expect(lemon.checkouts[0].attributes.checkout_data.discount_code).toBe(lemon.made[0].attributes.code)
    expect(lemon.checkouts[0].attributes.custom_price).toBeUndefined()
    // Unused: the same code next time.
    await buy()
    expect(lemon.made).toHaveLength(1)
  })

  it("an intro offer they bought with is spent: the usual checkout, and marked so", async () => {
    mocks.rows = [{ ...special(100), introMonths: 1, lemonDiscountId: "d1", lemonDiscountCode: "CLLAAAAAAAAAA", lemonDiscountCents: 1400 }]
    const lemon = fakeLemon()
    lemon.redeemed.add("d1")
    const result = await buy()
    expect(result.kind === "checkout" && result.url.startsWith("https://store.lemonsqueezy.com/buy/extension?")).toBe(true)
    expect(lemon.made).toEqual([])
    expect(lemon.checkouts).toEqual([])
    expect(mocks.rows[0].introUsedAt).toBeInstanceOf(Date)
    // From now on they're simply on the usual price.
    fakeLemon()
    const again = await buy()
    expect(again.kind === "checkout" && again.url.startsWith("https://store.lemonsqueezy.com/buy/extension?")).toBe(true)
  })

  it("an intro offer never becomes a custom price: no discount, no checkout", async () => {
    mocks.rows = [{ ...special(100), introMonths: 2 }]
    const lemon = fakeLemon({ refuse: ["discount"] })
    expect(await buy()).toEqual({ kind: "unavailable" })
    expect(lemon.checkouts).toEqual([])

    // The product already costs no more than the intro price: the usual checkout.
    fakeLemon({ variantPrice: 50 })
    const result = await buy()
    expect(result.kind === "checkout" && result.url.startsWith("https://store.lemonsqueezy.com/buy/extension?")).toBe(true)
  })

  it("buying spends an intro offer, and only an unspent intro offer", async () => {
    const at = new Date("2026-10-21T12:00:00.000Z")
    mocks.rows = [{ ...special(100), introMonths: 1 }, special(700, null, "x")]
    await markIntroUsed("u1", "linkedin", at)
    await markIntroUsed("u1", "x", at)
    expect(mocks.rows[0].introUsedAt).toEqual(at)
    expect(mocks.rows[1].introUsedAt ?? null).toBeNull()
    await markIntroUsed("u1", "linkedin", new Date("2026-12-01T00:00:00.000Z"))
    expect(mocks.rows[0].introUsedAt).toEqual(at)
  })

  it("a checkout lasts a day at most", () => {
    expect(checkoutExpiry(null, NOW).toISOString()).toBe("2026-10-22T10:00:00.000Z")
    expect(checkoutExpiry(new Date("2026-12-01T00:00:00.000Z"), NOW).toISOString()).toBe("2026-10-22T10:00:00.000Z")
  })
})

describe("the paywall message", () => {
  it("quotes the person's own price", async () => {
    mocks.rows = [special(500)]
    const gate = await reserveFreeGeneration("u1", 10)
    expect(gate.ok).toBe(false)
    if (gate.ok) return
    expect((await gate.response.json()).error).toContain("for $5/month to keep going")

    mocks.rows = []
    const usual = await reserveFreeGeneration("u1", 10)
    if (usual.ok) return
    expect((await usual.response.json()).error).toContain("for $15/month to keep going")

    mocks.rows = [{ ...special(100), introMonths: 1 }]
    const intro = await reserveFreeGeneration("u1", 10)
    if (intro.ok) return
    expect((await intro.response.json()).error).toContain("for $1 first month (then $15/month) to keep going")
  })
})

describe("the admin route", () => {
  const call = (handler: typeof PUT, body: unknown, method = "PUT", userId = "u1") =>
    handler(new Request(`https://admin.test/api/admin/engage/users/${userId}/price`, { method, body: JSON.stringify(body) }), {
      params: Promise.resolve({ userId }),
    })

  it("sets, changes and removes a price, each in the audit log with its reason", async () => {
    const set = await call(PUT, { platform: "linkedin", priceCents: 500, endsAt: "2099-11-30T23:59:59.000Z", reason: "Early supporter" })
    expect(set.status).toBe(200)
    expect(mocks.rows).toMatchObject([{ userId: "u1", platform: "linkedin", priceCents: 500, setBy: "admin@carouselabs.com" }])
    expect(mocks.audit[0]).toMatchObject({
      action: "ENGAGE_SET_PRICE",
      targetUserId: "u1",
      reason: "Early supporter",
      newValue: { platform: "linkedin", priceCents: 500, endsAt: "2099-11-30T23:59:59.000Z" },
    })

    await call(PUT, { platform: "linkedin", priceCents: 700, reason: "Changed my mind" })
    expect(mocks.rows).toHaveLength(1)
    expect(mocks.rows[0]).toMatchObject({ priceCents: 700, endsAt: null })
    expect(mocks.audit[1]).toMatchObject({ oldValue: { priceCents: 500 }, newValue: { priceCents: 700, endsAt: null } })

    const removed = await call(DELETE, { platform: "linkedin", reason: "Back to normal" }, "DELETE")
    expect(removed.status).toBe(200)
    expect(mocks.rows).toEqual([])
    expect(mocks.audit[2]).toMatchObject({ action: "ENGAGE_REMOVE_PRICE", oldValue: { priceCents: 700 }, newValue: undefined })
    expect((await call(DELETE, { platform: "linkedin", reason: "Again" }, "DELETE")).status).toBe(404)
  })

  it("refuses a price that isn't one, an end date in the past, or no reason", async () => {
    for (const body of [
      { platform: "linkedin", priceCents: 50, reason: "Too low" },
      { platform: "linkedin", priceCents: 100_000, reason: "Too high" },
      { platform: "linkedin", priceCents: 4.5, reason: "Not cents" },
      { platform: "linkedin", priceCents: 500, endsAt: "2020-01-01T00:00:00.000Z", reason: "Past" },
      { platform: "linkedin", priceCents: 500, reason: "" },
      { platform: "web", priceCents: 500, reason: "Not an extension" },
      { platform: "linkedin", priceCents: 100, introMonths: 0, reason: "No months" },
      { platform: "linkedin", priceCents: 100, introMonths: 13, reason: "Too many months" },
      { platform: "linkedin", priceCents: 1500, introMonths: 1, reason: "Intro at the usual price" },
    ]) {
      expect((await call(PUT, body)).status).toBe(400)
    }
    expect(mocks.rows).toEqual([])
    expect((await call(PUT, { platform: "x", priceCents: 500, reason: "Someone else" }, "PUT", "nobody")).status).toBe(404)
  })

  it("sets an intro offer, and saving one again makes a used one available again", async () => {
    await call(PUT, { platform: "linkedin", priceCents: 100, introMonths: 3, reason: "Launch offer" })
    expect(mocks.rows[0]).toMatchObject({ priceCents: 100, introMonths: 3, introUsedAt: null })
    expect(mocks.audit[0]).toMatchObject({ newValue: { priceCents: 100, introMonths: 3 } })
    expect(String(mocks.audit[0].details)).toContain("for the first 3 months, then the usual price")

    mocks.rows[0].introUsedAt = NOW
    await call(PUT, { platform: "linkedin", priceCents: 100, introMonths: 3, reason: "Once more" })
    expect(mocks.rows[0].introUsedAt).toBeNull()

    // A different length at the same price needs a new checkout discount.
    Object.assign(mocks.rows[0], { lemonDiscountId: "d1", lemonDiscountCode: "CLLAAAAAAAAAA", lemonDiscountCents: 1400 })
    await call(PUT, { platform: "linkedin", priceCents: 100, introMonths: 1, reason: "Shorter" })
    expect(mocks.rows[0]).toMatchObject({ introMonths: 1, lemonDiscountId: null, lemonDiscountCode: null })

    // Every month again.
    await call(PUT, { platform: "linkedin", priceCents: 500, reason: "Every month" })
    expect(mocks.rows[0]).toMatchObject({ priceCents: 500, introMonths: null })
  })

  it("needs access-management permission to change a price, view permission to see one", async () => {
    mocks.rows = [special(500)]
    mocks.subscription.mockResolvedValue({ status: "active", endsAt: null })
    const res = await GET(new Request("https://admin.test/x"), { params: Promise.resolve({ userId: "u1" }) })
    const body = await res.json()
    expect(mocks.gate).toHaveBeenLastCalledWith(expect.any(Request), "engage.view")
    expect(body.subscribed).toEqual({ linkedin: true, x: false, reddit: false })
    expect(body.prices.map((p: { platform: string; now: { cents: number } }) => [p.platform, p.now.cents])).toEqual([["linkedin", 500], ["x", 1500], ["reddit", 1500]])

    await call(PUT, { platform: "x", priceCents: 500, reason: "Early supporter" })
    expect(mocks.gate).toHaveBeenLastCalledWith(expect.any(Request), "engage.access.manage")
    mocks.gate.mockResolvedValue({ ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) })
    expect((await call(PUT, { platform: "x", priceCents: 300, reason: "Not allowed" })).status).toBe(403)
    expect(mocks.rows.find((r) => r.platform === "x")?.priceCents).toBe(500)
  })
})

describe("the admin card", () => {
  type Answer = { prices: unknown[]; subscribed: Record<string, boolean> }
  const answer = (linkedin: unknown, subscribed = { linkedin: false, x: false }): Answer => ({
    prices: [
      { platform: "linkedin", standardCents: 1500, now: {}, special: linkedin },
      { platform: "x", standardCents: 1500, now: {}, special: null },
    ],
    subscribed,
  })
  function serve(first: Answer) {
    const sent: { method: string; body: unknown }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method && init.method !== "GET") {
          sent.push({ method: init.method, body: JSON.parse(String(init.body)) })
          return Response.json({ ok: true })
        }
        return Response.json(first)
      }),
    )
    return sent
  }

  it("sets a price with an optional last day, showing what they'll see", async () => {
    const sent = serve(answer(null))
    render(<EngagePriceCard userId="u1" />)
    const linkedin = within(await screen.findByRole("listitem", { name: "Engage for LinkedIn price" }))
    expect(linkedin.getByText("Usual price, $15/month")).toBeTruthy()

    fireEvent.click(linkedin.getByRole("button", { name: "Set price" }))
    const dialog = within(await screen.findByRole("dialog"))
    const price = dialog.getByPlaceholderText("5")
    fireEvent.change(price, { target: { value: "15" } })
    expect(dialog.getByText(/That's the usual price/)).toBeTruthy()
    fireEvent.change(price, { target: { value: "5" } })
    expect(dialog.getByText("$5/month")).toBeTruthy()
    expect(dialog.getByText("$15").tagName).toBe("S")

    fireEvent.change(dialog.getByLabelText(/Last day to buy/), { target: { value: "2099-11-30" } })
    fireEvent.change(dialog.getByLabelText(/Reason/), { target: { value: "Early supporter" } })
    fireEvent.click(dialog.getByRole("button", { name: "Save price" }))
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      method: "PUT",
      body: { platform: "linkedin", priceCents: 500, introMonths: null, endsAt: "2099-11-30T23:59:59.000Z", reason: "Early supporter" },
    })
  })

  it("sets an intro offer for the first months, then the usual price", async () => {
    const sent = serve(answer(null))
    render(<EngagePriceCard userId="u1" />)
    const linkedin = within(await screen.findByRole("listitem", { name: "Engage for LinkedIn price" }))
    fireEvent.click(linkedin.getByRole("button", { name: "Set price" }))
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.change(dialog.getByLabelText("Months at this price"), { target: { value: "3" } })
    expect((dialog.getByRole("radio", { name: /Only the first/ }) as HTMLInputElement).checked).toBe(true)
    fireEvent.change(dialog.getByPlaceholderText("5"), { target: { value: "15" } })
    expect(dialog.getByText("An intro price must be less than the usual $15")).toBeTruthy()
    fireEvent.change(dialog.getByPlaceholderText("5"), { target: { value: "1" } })
    expect(dialog.getByText("$1/month for 3 months")).toBeTruthy()
    fireEvent.change(dialog.getByLabelText(/Reason/), { target: { value: "Launch offer" } })
    fireEvent.click(dialog.getByRole("button", { name: "Save price" }))
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0].body).toEqual({ platform: "linkedin", priceCents: 100, introMonths: 3, endsAt: null, reason: "Launch offer" })
  })

  it("shows an intro offer, and one they've used", async () => {
    const offer = { priceCents: 100, introMonths: 1, endsAt: null, reason: "Launch", setBy: "admin@carouselabs.com", updatedAt: NOW.toISOString(), ended: false, discountCode: null }
    serve(answer({ ...offer, introUsedAt: null }))
    render(<EngagePriceCard userId="u1" />)
    let linkedin = within(await screen.findByRole("listitem", { name: "Engage for LinkedIn price" }))
    expect(linkedin.getByText("Intro offer")).toBeTruthy()
    expect(linkedin.getByText("$1 first month")).toBeTruthy()
    expect(linkedin.getByText("then $15/month")).toBeTruthy()
    cleanup()

    serve(answer({ ...offer, introUsedAt: "2026-10-20T10:00:00.000Z" }))
    render(<EngagePriceCard userId="u1" />)
    linkedin = within(await screen.findByRole("listitem", { name: "Engage for LinkedIn price" }))
    expect(linkedin.getByText("Usual price, $15/month")).toBeTruthy()
    expect(linkedin.getByText(/Intro offer used .*: was \$1 for your first month, then \$15\/month/)).toBeTruthy()
  })

  it("shows a special price struck against the usual one, warns when already subscribed, and removes it", async () => {
    const sent = serve(
      answer(
        { priceCents: 500, endsAt: null, reason: "Early supporter", setBy: "admin@carouselabs.com", updatedAt: NOW.toISOString(), ended: false },
        { linkedin: true, x: false },
      ),
    )
    render(<EngagePriceCard userId="u1" />)
    const linkedin = within(await screen.findByRole("listitem", { name: "Engage for LinkedIn price" }))
    expect(linkedin.getByText("Special")).toBeTruthy()
    expect(linkedin.getByText("$15").tagName).toBe("S")
    expect(linkedin.getByText("$5/month")).toBeTruthy()
    expect(linkedin.getByText(/Already subscribed/)).toBeTruthy()
    expect(within(screen.getByRole("listitem", { name: "Engage for X price" })).queryByText(/Already subscribed/)).toBeNull()

    fireEvent.click(linkedin.getByRole("button", { name: "Remove" }))
    const dialog = within(await screen.findByRole("dialog"))
    fireEvent.change(dialog.getByLabelText(/Reason/), { target: { value: "Back to normal" } })
    fireEvent.click(dialog.getByRole("button", { name: "Remove price" }))
    await waitFor(() => expect(sent).toEqual([{ method: "DELETE", body: { platform: "linkedin", reason: "Back to normal" } }]))
  })
})

describe("what the person sees on the website", () => {
  const ext = (price: ExtAccessSummary["price"], access: ExtAccessSummary["access"] = "free"): ExtAccessSummary => ({
    access, freeUsed: 10, freeLimit: 10, status: null, renewsAt: null, endsAt: null, manageUrl: null,
    source: access === "free" ? "free" : "subscription", grantEndsAt: null, suspended: false,
    features: {
      comments: true,
      replies: true,
      connection_notes: true,
      messages: true,
      x_replies: true,
      x_messages: true,
      reddit_comments: true,
      reddit_messages: true,
    },
    price,
  })

  it("their special price, the usual one struck through, and until when", () => {
    const price = priceFor("linkedin", { priceCents: 500, endsAt: new Date("2026-11-30T23:59:59.000Z") }, NOW)
    render(<ExtensionPlanSection ext={ext(price)} />)
    // The big price, with the usual one struck through beside it.
    const big = screen.getByText("$5")
    expect(big.className).toContain("text-[2.5rem]")
    expect(big.parentElement?.querySelector("s")?.textContent).toBe("Usually $15")
    expect(screen.getAllByText("$15").every((el) => el.closest("s"))).toBe(true)
    expect(screen.getByText(/Your special price, available until Nov 30, 2026/)).toBeTruthy()
    expect(screen.getByRole("link", { name: /Get the extension/ }).textContent).toContain("$5/month")
  })

  it("an intro offer: the price, for how long, and what comes after", () => {
    const price = priceFor("linkedin", { priceCents: 100, endsAt: null, introMonths: 1 }, NOW)
    render(<ExtensionPlanSection ext={ext(price)} />)
    expect(screen.getByText("$1").className).toContain("text-[2.5rem]")
    expect(screen.getByText("first month")).toBeTruthy()
    expect(screen.getByText(/Your special offer: \$1 for your first month, then \$15\/month/)).toBeTruthy()
    expect(screen.getByRole("link", { name: /Get the extension/ }).textContent).toContain("$1 first month")
  })

  it("the usual price for everyone else", () => {
    render(<ExtensionPlanSection ext={ext(standardPrice("linkedin"))} />)
    expect(screen.queryByText(/special price/)).toBeNull()
    expect(screen.getByRole("link", { name: /Get the extension/ }).textContent).toBe("Get the extension — $15/month")
  })
})
