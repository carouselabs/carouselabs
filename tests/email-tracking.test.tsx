// @vitest-environment jsdom
// Seen and clicked for the emails the admin sends (lib/emailTracking.ts):
// signed tokens, the invisible image and tracked links in each copy, the
// public routes that record them (app/api/email-track/*), campaigns and
// personal emails, and how the admin sees it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"

const m = vi.hoisted(() => ({
  jobs: [] as (() => unknown)[],
  recipientUpdates: [] as { where: Record<string, unknown>; data: Record<string, unknown> }[],
  personalUpdates: [] as { where: Record<string, unknown>; data: Record<string, unknown> }[],
  tracks: [] as Record<string, unknown>[],
  trackCreate: vi.fn(),
  trackDelete: vi.fn(),
  send: vi.fn(),
  batch: vi.fn(),
  audit: vi.fn(),
  auditRows: [] as Record<string, unknown>[],
  failUpdates: null as null | Error,
}))

vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  // after(): run once the response is out; here, when the test says so.
  after: (job: () => unknown) => void m.jobs.push(job),
}))
vi.mock("@/lib/db", () => ({
  db: {
    emailCampaignRecipient: {
      updateMany: vi.fn(async (q: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (m.failUpdates) throw m.failUpdates
        m.recipientUpdates.push(q)
        return { count: 1 }
      }),
    },
    personalEmailTrack: {
      updateMany: vi.fn(async (q: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        m.personalUpdates.push(q)
        return { count: 1 }
      }),
      create: m.trackCreate,
      delete: m.trackDelete,
      findMany: vi.fn(async ({ where }: { where: { emailId: { in: string[] } } }) => m.tracks.filter((t) => where.emailId.in.includes(String(t.emailId)))),
    },
    user: { findUnique: vi.fn(async () => ({ id: "u1", email: "priya@example.com", deletedAt: null })) },
    auditLog: { findMany: vi.fn(async () => m.auditRows) },
  },
}))
vi.mock("@/lib/adminAuth", () => ({
  getAdminUser: vi.fn(async () => ({ id: "admin1", email: "admin@carouselabs.com" })),
  adminForbidden: () => new Response("forbidden", { status: 403 }),
}))
vi.mock("@/lib/auditLog", () => ({ logAdminAction: m.audit, getRequestIp: () => null }))
vi.mock("resend", () => ({ Resend: class { emails = { send: m.send } } }))
vi.mock("@/lib/broadcastVariables", () => ({
  resolveVariables: vi.fn(async () => ({ firstName: "Priya", email: "priya@example.com", plan: "FREE", creditsRemaining: "20", daysSinceSignup: "12", referralCode: "X", referralLink: "https://carouselabs.com/?ref=X" })),
  resolveVariablesMany: vi.fn(async () => new Map()),
}))

import { clickDestination, readTrackingToken, recordEmailEvent, trackingToken, withTracking } from "@/lib/emailTracking"
import { campaignEngagement, percentOf } from "@/lib/campaignRules"
import { GET as openRoute } from "@/app/api/email-track/open/[token]/route"
import { GET as clickRoute } from "@/app/api/email-track/click/[token]/route"
import { GET as historyRoute, POST as personalRoute } from "@/app/api/admin/users/[userId]/email/route"
import { sendUserBroadcast } from "@/lib/broadcast"
import { sendDesignedEmails } from "@/lib/emailDesignRender"
import type { EmailDesign } from "@/lib/emailDesign"
import { CampaignView } from "@/components/admin/CampaignView"
import type { Resend } from "resend"

const R2 = "https://art.example.test"
const art = (name: string) => `${R2}/email-art/2026-10/${name}`
const SITE = "https://carouselabs.com"

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-only-secret")
  vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", R2)
  m.jobs = []
  m.recipientUpdates = []
  m.personalUpdates = []
  m.tracks = []
  m.auditRows = []
  m.failUpdates = null
  for (const fn of [m.trackCreate, m.trackDelete, m.send, m.batch, m.audit]) fn.mockReset()
  m.trackCreate.mockResolvedValue({})
  m.trackDelete.mockResolvedValue({})
  m.send.mockResolvedValue({ data: { id: "re_1" }, error: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
const runAfter = async () => {
  for (const job of m.jobs.splice(0)) await job()
}

describe("signed tokens", () => {
  it("name one email, and can't be changed or made without the key", () => {
    const token = trackingToken({ kind: "campaign", id: "r42" })!
    expect(readTrackingToken(token)).toEqual({ kind: "campaign", id: "r42" })
    expect(readTrackingToken(trackingToken({ kind: "personal", id: "e-1" })!)).toEqual({ kind: "personal", id: "e-1" })

    const [payload, sig] = token.split(".")
    expect(readTrackingToken(`cr43.${sig}`)).toBeNull()
    expect(readTrackingToken(`p${payload.slice(1)}.${sig}`)).toBeNull()
    expect(readTrackingToken(`${payload}.${sig.slice(0, -1)}A`.replace(/AA$/, "AB"))).toBeNull()
    expect(readTrackingToken("nonsense")).toBeNull()

    vi.stubEnv("CLERK_SECRET_KEY", "a-different-secret")
    expect(readTrackingToken(token)).toBeNull()
    vi.stubEnv("CLERK_SECRET_KEY", "")
    expect(trackingToken({ kind: "campaign", id: "r42" })).toBeNull()
  })
})

describe("a tracked copy", () => {
  const token = () => trackingToken({ kind: "campaign", id: "r1" })!

  it("carries the invisible image, and its allowed links pass through the site", () => {
    const html = `<html><body><a href="https://carouselabs.com/dashboard?a=1&amp;b=2">Go</a> <a href="https://evil.example.com/x">No</a> <a href="mailto:support@carouselabs.com">Mail</a></body></html>`
    const out = withTracking(html, token())
    expect(out).toContain(`<img src="${SITE}/api/email-track/open/${token()}" width="1" height="1"`)
    expect(out.indexOf("/api/email-track/open/")).toBeLessThan(out.indexOf("</body>"))
    expect(out).toContain(`href="${SITE}/api/email-track/click/${token()}?to=${encodeURIComponent("https://carouselabs.com/dashboard?a=1&b=2")}"`)
    expect(out).toContain(`href="https://evil.example.com/x"`)
    expect(out).toContain(`href="mailto:support@carouselabs.com"`)
    // Tracking twice changes nothing more.
    expect(withTracking(out, token()).match(/email-track\/click/g)).toHaveLength(1)
  })

  it("goes only where our emails may link", () => {
    expect(clickDestination("https://www.linkedin.com/feed/")).toBe("https://www.linkedin.com/feed/")
    for (const bad of ["https://evil.example.com/", "javascript:alert(1)", "http://carouselabs.com/", "{{referralLink}}", null]) {
      expect(clickDestination(bad)).toBeNull()
    }
  })

  it("a plain broadcast copy is tracked only for people with a token", async () => {
    m.batch.mockImplementation(async (emails: { to: string }[]) => ({ data: { data: emails.map((_, i) => ({ id: `re_${i}` })) }, error: null }))
    const resend = { batch: { send: m.batch } } as unknown as Resend
    await sendUserBroadcast(resend, "CarouseLabs <x@carouselabs.com>", [
      { userId: null, email: "a@example.test", trackingToken: token() },
      { userId: null, email: "b@example.test" },
    ], "Hello", "Read [this](https://carouselabs.com/dashboard).", "test")
    const [a, b] = m.batch.mock.calls[0][0] as { html: string }[]
    expect(a.html).toContain("/api/email-track/open/")
    expect(a.html).toContain("/api/email-track/click/")
    expect(b.html).not.toContain("/api/email-track/")
  })
})

describe("a tracked designed campaign copy", () => {
  it("is tracked only for people with a token", async () => {
    m.batch.mockImplementation(async (emails: { to: string }[]) => ({ data: { data: emails.map((_, i) => ({ id: `re_${i}` })) }, error: null }))
    const resend = { batch: { send: m.batch } } as unknown as Resend
    const design: EmailDesign = {
      version: 1,
      subject: "Quick wins",
      preview: "Three quick ways to use Engage today, each under a minute.",
      hero: { lead: "Quick", accent: "wins.", scene: "two paper cups", paintingUrl: art("p.jpg"), imageUrl: art("h.jpg") },
      blocks: [
        { type: "text", text: "Hi {{firstName}}," },
        { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
      ],
    }
    const token = trackingToken({ kind: "campaign", id: "r9" })!
    await sendDesignedEmails(resend, "CarouseLabs <x@carouselabs.com>", [
      { userId: null, email: "a@example.test", trackingToken: token },
      { userId: null, email: "b@example.test", trackingToken: null },
    ], design, "test")
    const [a, b] = m.batch.mock.calls[0][0] as { html: string }[]
    expect(a.html).toContain(`/api/email-track/open/${token}`)
    expect(a.html).toContain(`/api/email-track/click/${token}?to=${encodeURIComponent("https://www.linkedin.com/feed/")}`)
    expect(b.html).not.toContain("/api/email-track/")
  })
})

describe("the public routes", () => {
  const params = (token: string) => ({ params: Promise.resolve({ token }) })

  it("the image always comes back at once; only a real token is counted, afterwards", async () => {
    const token = trackingToken({ kind: "campaign", id: "r1" })!
    const res = await openRoute(new Request("https://x/"), params(token))
    expect(res.headers.get("Content-Type")).toBe("image/gif")
    expect(res.headers.get("Cache-Control")).toContain("no-store")
    expect(new Uint8Array(await res.arrayBuffer()).length).toBeGreaterThan(30)
    expect(m.recipientUpdates).toEqual([])
    await runAfter()
    expect(m.recipientUpdates.map((u) => u.where)).toEqual([{ id: "r1", openedAt: null }, { id: "r1" }])
    expect(m.recipientUpdates[1].data).toMatchObject({ openCount: { increment: 1 }, lastOpenedAt: expect.any(Date) })

    const bad = await openRoute(new Request("https://x/"), params("cr1.forgedforgedforgedfor"))
    expect(bad.headers.get("Content-Type")).toBe("image/gif")
    expect(m.jobs).toEqual([])
  })

  it("a click goes straight on and is counted; elsewhere goes home, uncounted", async () => {
    const token = trackingToken({ kind: "personal", id: "e1" })!
    const to = "https://carouselabs.com/extension"
    const res = await clickRoute(new Request(`https://x/?to=${encodeURIComponent(to)}`), params(token))
    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe(to)
    await runAfter()
    expect(m.personalUpdates.map((u) => u.where)).toEqual([{ emailId: "e1", openedAt: null }, { emailId: "e1", clickedAt: null }, { emailId: "e1" }])
    expect(m.personalUpdates[2].data).toEqual({ clickCount: { increment: 1 } })

    const away = await clickRoute(new Request(`https://x/?to=${encodeURIComponent("https://evil.example.com/")}`), params(token))
    expect(away.headers.get("Location")).toBe(`${SITE}/`)
    expect(m.jobs).toEqual([])
    const forged = await clickRoute(new Request(`https://x/?to=${encodeURIComponent(to)}`), params("pe1.forgedforgedforgedfor"))
    expect(forged.headers.get("Location")).toBe(to)
    expect(m.jobs).toEqual([])
  })

  it("a database problem never breaks anything", async () => {
    m.failUpdates = new Error("database hiccup")
    vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(recordEmailEvent({ kind: "campaign", id: "r1" }, "open")).resolves.toBeUndefined()
  })
})

describe("personal emails", () => {
  const design = {
    version: 1,
    subject: "A quick one for you, {{firstName}}",
    preview: "One thing worth trying first in Engage, picked for how you write on LinkedIn.",
    hero: { lead: "One thing", accent: "worth trying.", scene: "two paper cups", paintingUrl: art("p.jpg"), imageUrl: art("h.jpg") },
    blocks: [
      { type: "text", text: "Hi {{firstName}},\n\nTry one comment today." },
      { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
    ],
  }
  const post = () =>
    personalRoute(new Request("http://x", { method: "POST", body: JSON.stringify({ design }) }), { params: Promise.resolve({ userId: "u1" }) })

  it("each one is tracked: its own row, the image and tracked links, and its id in the log", async () => {
    expect((await post()).status).toBe(200)
    const emailId = m.trackCreate.mock.calls[0][0].data.emailId as string
    expect(m.trackCreate).toHaveBeenCalledWith({ data: { emailId, userId: "u1" } })
    const html = m.send.mock.calls[0][0].html as string
    const token = trackingToken({ kind: "personal", id: emailId })!
    expect(html).toContain(`/api/email-track/open/${token}`)
    expect(html).toContain(`/api/email-track/click/${token}?to=${encodeURIComponent("https://www.linkedin.com/feed/")}`)
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ newValue: expect.objectContaining({ emailId }) }))
  })

  it("a failed send leaves no row; without the table it goes out untracked", async () => {
    m.send.mockResolvedValueOnce({ data: null, error: { message: "daily_quota_exceeded" } })
    expect((await post()).status).toBe(502)
    expect(m.trackDelete).toHaveBeenCalledWith({ where: { emailId: m.trackCreate.mock.calls[0][0].data.emailId } })

    m.trackCreate.mockRejectedValueOnce(Object.assign(new Error("no table"), { code: "P2021" }))
    expect((await post()).status).toBe(200)
    expect(m.send.mock.calls.at(-1)?.[0].html).not.toContain("/api/email-track/")
    expect(m.audit).toHaveBeenLastCalledWith(expect.objectContaining({ newValue: expect.objectContaining({ emailId: null }) }))
  })

  it("the history says whether each was seen and clicked", async () => {
    const at = new Date("2026-10-22T10:00:00.000Z")
    m.auditRows = [
      { id: "a2", createdAt: at, adminEmail: "admin@carouselabs.com", newValue: { subject: "New", picture: null, emailId: "e2" } },
      { id: "a1", createdAt: at, adminEmail: "admin@carouselabs.com", newValue: { subject: "Old", picture: null } },
    ]
    m.tracks = [{ emailId: "e2", openedAt: at, openCount: 2, clickedAt: at, clickCount: 1 }]
    const { emails } = await (await historyRoute(new Request("http://x"), { params: Promise.resolve({ userId: "u1" }) })).json()
    expect(emails[0]).toMatchObject({ subject: "New", tracked: true, openedAt: at.toISOString(), openCount: 2, clickedAt: at.toISOString(), clickCount: 1 })
    expect(emails[1]).toMatchObject({ subject: "Old", tracked: false, openedAt: null })
  })
})

describe("the campaign page", () => {
  it("adds up seen and clicked from the people it was sent to", () => {
    const list = [
      { status: "sent", openedAt: "x", clickedAt: "x" },
      { status: "sent", openedAt: "x", clickedAt: null },
      { status: "sent", openedAt: null, clickedAt: null },
      { status: "pending", openedAt: null, clickedAt: null },
    ]
    expect(campaignEngagement(list)).toEqual({ sent: 3, seen: 2, clicked: 1 })
    expect(percentOf(2, 3)).toBe("67%")
    expect(percentOf(0, 0)).toBe("0%")
  })

  it("shows the totals, who saw and clicked it, and filters by seen", async () => {
    const person = (id: string, over: Record<string, unknown>) => ({
      id, email: `${id}@example.test`, name: null, userId: null, status: "sent", sentAt: "2026-10-22T09:00:00.000Z", error: null,
      openedAt: null, lastOpenedAt: null, openCount: 0, clickedAt: null, clickCount: 0, ...over,
    })
    const campaign = {
      id: "c1", subject: "Quick wins", body: "Hi", audience: "all", audienceValue: null, status: "active", design: null,
      createdBy: "admin@carouselabs.com", createdAt: "2026-10-21T09:00:00.000Z",
      recipients: [
        person("ana", { openedAt: "2026-10-22T10:00:00.000Z", openCount: 2, clickedAt: "2026-10-22T10:01:00.000Z", clickCount: 1 }),
        person("ben", { openedAt: "2026-10-22T11:00:00.000Z", openCount: 1 }),
        person("cy", {}),
        person("dee", { status: "pending", sentAt: null }),
      ],
      progress: { total: 4, pending: 1, sending: 0, sent: 3, failed: 0, complete: false },
      allowance: { limit: 80, sentInLast24h: 3, left: 77 },
    }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ campaign })))
    render(<CampaignView id="c1" />)

    const totals = await screen.findByLabelText("Seen and clicked")
    expect(totals.textContent).toContain("Seen by 2 of 3 sent (67%)")
    expect(totals.textContent).toContain("Clicked by 1 (33%)")

    const row = (email: string) => within(screen.getByText(email).closest("tr")!)
    expect(row("ana@example.test").getByText(/^Seen /).textContent).toContain("· 2×")
    expect(row("ana@example.test").getByText(/Clicked/)).toBeTruthy()
    expect(row("cy@example.test").getByText("Not seen yet")).toBeTruthy()
    expect(row("dee@example.test").queryByText("Not seen yet")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Not seen 1" }))
    expect(screen.queryByText("ana@example.test")).toBeNull()
    expect(screen.getByText("cy@example.test")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Seen 2" }))
    expect(screen.getByText("ben@example.test")).toBeTruthy()
    expect(screen.queryByText("cy@example.test")).toBeNull()
  })
})
