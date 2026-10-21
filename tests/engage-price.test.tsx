// @vitest-environment jsdom
// Special prices for an Engage extension: an admin sets one person's price
// (e.g. $5 instead of $15), their checkout charges it through a checkout made
// for them, and they see it with the usual price struck through.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

type Row = { id: string; userId: string; platform: string; priceCents: number; endsAt: Date | null; reason: string; setBy: string; createdAt: Date; updatedAt: Date }

const mocks = vi.hoisted(() => ({
  rows: [] as Row[],
  audit: [] as Record<string, unknown>[],
  gate: vi.fn(),
  subscription: vi.fn(),
  xSubscription: vi.fn(),
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
    },
  }
})
vi.mock("@/lib/engage/adminAccess", () => ({ requireEngagePermission: mocks.gate }))

import { formatUsd, parseDollars, priceFor, standardPrice } from "@/lib/engage/priceRules"
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
    expect(priceFor("linkedin", null, NOW)).toEqual({ cents: 1500, standardCents: 1500, special: false, endsAt: null })
    expect(priceFor("linkedin", { priceCents: 500, endsAt: null }, NOW)).toEqual({ cents: 500, standardCents: 1500, special: true, endsAt: null })
    const ends = new Date("2026-11-30T23:59:59.000Z")
    expect(priceFor("x", { priceCents: 500, endsAt: ends }, NOW)).toMatchObject({ cents: 500, special: true, endsAt: ends.toISOString() })
    // Its last day has passed: the usual price again.
    expect(priceFor("linkedin", { priceCents: 500, endsAt: new Date("2026-10-20T23:59:59.000Z") }, NOW)).toEqual(standardPrice("linkedin"))
    // The usual price set as "special" is no special price.
    expect(priceFor("linkedin", { priceCents: 1500, endsAt: null }, NOW).special).toBe(false)
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
  const lemon = (body: unknown = { data: { attributes: { url: "https://carouselabs.lemonsqueezy.com/checkout/custom/abc" } } }, status = 201) => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void url
      void init
      return new Response(JSON.stringify(body), { status })
    })
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
  }

  it("charges a special price through a checkout made for that person", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
    mocks.rows = [special(500, new Date("2026-10-22T05:00:00.000Z"))]
    const fetchMock = lemon()

    const result = await extensionCheckoutFor({ id: "u1", email: "priya@example.com" })
    expect(result).toEqual({ kind: "checkout", url: "https://carouselabs.lemonsqueezy.com/checkout/custom/abc" })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.lemonsqueezy.com/v1/checkouts")
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-only-key")
    const { data } = JSON.parse(String(init?.body))
    expect(data.attributes.custom_price).toBe(500)
    expect(data.attributes.product_options.enabled_variants).toEqual([44])
    expect(data.attributes.checkout_data.email).toBe("priya@example.com")
    expect(data.relationships).toEqual({ store: { data: { type: "stores", id: "7" } }, variant: { data: { type: "variants", id: "44" } } })
    // Bound to this account, exactly like the usual checkout.
    const custom = data.attributes.checkout_data.custom
    expect(custom.user_id).toBe("u1")
    expect(verifyBillingIdentity("u1", "44", custom.identity_signature)).toBe(true)
    // The special price ends in less than a day, so the checkout does too.
    expect(data.attributes.expires_at).toBe("2026-10-22T05:00:00.000Z")
  })

  it("never falls back to the usual-price link when Lemon Squeezy says no", async () => {
    mocks.rows = [special(500)]
    lemon({ errors: [{ detail: "nope" }] }, 422)
    expect(await extensionCheckoutFor({ id: "u1", email: "priya@example.com" })).toEqual({ kind: "unavailable" })
    vi.stubEnv("LEMONSQUEEZY_STORE_ID", "")
    expect(await extensionCheckoutFor({ id: "u1", email: "priya@example.com" })).toEqual({ kind: "unavailable" })
  })

  it("keeps the usual shared link for everyone else, and for an ended special price", async () => {
    const fetchMock = lemon()
    mocks.rows = [special(500, new Date("2026-10-01T23:59:59.000Z")), special(700, null, "x")]
    const result = await extensionCheckoutFor({ id: "u1", email: "priya@example.com" })
    expect(result.kind === "checkout" && result.url.startsWith("https://store.lemonsqueezy.com/buy/extension?")).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
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
    ]) {
      expect((await call(PUT, body)).status).toBe(400)
    }
    expect(mocks.rows).toEqual([])
    expect((await call(PUT, { platform: "x", priceCents: 500, reason: "Someone else" }, "PUT", "nobody")).status).toBe(404)
  })

  it("needs access-management permission to change a price, view permission to see one", async () => {
    mocks.rows = [special(500)]
    mocks.subscription.mockResolvedValue({ status: "active", endsAt: null })
    const res = await GET(new Request("https://admin.test/x"), { params: Promise.resolve({ userId: "u1" }) })
    const body = await res.json()
    expect(mocks.gate).toHaveBeenLastCalledWith(expect.any(Request), "engage.view")
    expect(body.subscribed).toEqual({ linkedin: true, x: false })
    expect(body.prices.map((p: { platform: string; now: { cents: number } }) => [p.platform, p.now.cents])).toEqual([["linkedin", 500], ["x", 1500]])

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
      body: { platform: "linkedin", priceCents: 500, endsAt: "2099-11-30T23:59:59.000Z", reason: "Early supporter" },
    })
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
    features: { comments: true, replies: true, connection_notes: true, messages: true, x_replies: true, x_messages: true },
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

  it("the usual price for everyone else", () => {
    render(<ExtensionPlanSection ext={ext(standardPrice("linkedin"))} />)
    expect(screen.queryByText(/special price/)).toBeNull()
    expect(screen.getByRole("link", { name: /Get the extension/ }).textContent).toBe("Get the extension — $15/month")
  })
})
