// The Email report (Admin → Broadcasts → Email report): the numbers
// (lib/emailReportRules.ts), loading them for a date range and filters
// (lib/emailReport.ts, against an in-memory database), and the route's dates.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

const m = vi.hoisted(() => ({
  recipients: [] as Record<string, unknown>[],
  personal: [] as Record<string, unknown>[],
  campaigns: [] as Record<string, unknown>[],
  events: [] as Record<string, unknown>[],
  stops: [] as { stopReason: string | null; _count: { _all: number } }[],
  noLog: false,
  admin: { email: "admin@carouselabs.com" } as { email: string } | null,
}))

const inRange = (v: unknown, c: { gte?: Date; lt?: Date }) => v instanceof Date && (!c.gte || v >= c.gte) && (!c.lt || v < c.lt)
function matches(row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Record<string, unknown>[]).some((w) => matches(row, w))
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const c = v as { in?: unknown[]; gte?: Date; lt?: Date }
      if (c.in) return c.in.includes(row[k])
      return inRange(row[k], c)
    }
    return row[k] === v
  })
}

vi.mock("@/lib/db", () => ({
  db: {
    emailCampaignRecipient: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => m.recipients.filter((r) => matches(r, where))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => m.recipients.find((r) => r.id === where.id) ?? null),
    },
    personalEmailTrack: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => m.personal.filter((r) => matches(r, where))),
      findUnique: vi.fn(async ({ where }: { where: { emailId: string } }) => m.personal.find((r) => r.emailId === where.emailId) ?? null),
    },
    emailCampaign: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => m.campaigns.filter((r) => matches(r, where))) },
    emailTrackEvent: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (m.noLog) throw new Prisma.PrismaClientKnownRequestError("no table", { code: "P2021", clientVersion: "5.22.0" })
        return m.events.filter((e) => matches(e, where))
      }),
    },
    lead: { groupBy: vi.fn(async () => m.stops) },
  },
}))
vi.mock("@/lib/adminAuth", () => ({
  getAdminUser: vi.fn(async () => m.admin),
  adminForbidden: () => Response.json({ error: "Admins only" }, { status: 403 }),
}))

import {
  activityOf,
  appsOf,
  campaignLines,
  dailyOf,
  emailApp,
  filterRows,
  first48Hours,
  istDay,
  leadStops,
  topLinks,
  totalsOf,
  whenTheyRead,
  type SentRow,
} from "@/lib/emailReportRules"
import { campaignActivity, emailReport } from "@/lib/emailReport"
import { GET as reportRoute } from "@/app/api/admin/email-report/route"
import { GET as activityRoute } from "@/app/api/admin/email-activity/route"

const D = (iso: string) => new Date(iso)
const row = (over: Partial<SentRow>): SentRow => ({
  ref: "r",
  kind: "campaign",
  campaignId: "c1",
  user: true,
  via: "resend",
  status: "sent",
  sentAt: D("2026-10-24T05:00:00Z"),
  openedAt: null,
  clickedAt: null,
  scannedAt: null,
  autoOpenedAt: null,
  ...over,
})
const CHROME_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
const GMAIL = "Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)"

describe("the numbers", () => {
  const rows = [
    row({ ref: "a", openedAt: D("2026-10-24T06:00:00Z"), clickedAt: D("2026-10-24T06:01:00Z") }),
    row({ ref: "b", openedAt: D("2026-10-24T07:00:00Z"), scannedAt: D("2026-10-24T05:00:05Z") }),
    row({ ref: "c", scannedAt: D("2026-10-24T05:00:05Z") }),
    row({ ref: "d", autoOpenedAt: D("2026-10-24T05:10:00Z") }),
    row({ ref: "e", status: "failed" }),
  ]

  it("sent, seen, clicked, scanner-only and Apple maybes, people only", () => {
    expect(totalsOf(rows)).toEqual({ sent: 4, failed: 1, seen: 2, clicked: 1, scanned: 2, maybeApple: 1 })
  })

  it("filters by kind, service and whether they're users or leads", () => {
    const mixed = [row({ ref: "u" }), row({ ref: "l", user: false, via: "brevo" }), row({ ref: "p", kind: "personal", campaignId: null, via: null })]
    const refs = (f: Parameters<typeof filterRows>[1]) => filterRows(mixed, f).map((r) => r.ref)
    expect(refs({ kind: "all", via: "all", who: "all" })).toEqual(["u", "l", "p"])
    expect(refs({ kind: "campaigns", via: "all", who: "all" })).toEqual(["u", "l"])
    expect(refs({ kind: "personal", via: "all", who: "all" })).toEqual(["p"])
    expect(refs({ kind: "all", via: "brevo", who: "all" })).toEqual(["l"])
    // Personal emails don't record what sent them: only "all" keeps them.
    expect(refs({ kind: "all", via: "resend", who: "all" })).toEqual(["u"])
    expect(refs({ kind: "all", via: "all", who: "leads" })).toEqual(["l"])
    expect(refs({ kind: "all", via: "all", who: "users" })).toEqual(["u", "p"])
  })

  it("days are India's days, every one in the range, from the first email for all time", () => {
    // 20:00 UTC on the 23rd is 1:30 AM on the 24th in India.
    expect(istDay(D("2026-10-23T20:00:00Z"))).toBe("2026-10-24")
    const daily = dailyOf(
      [row({ sentAt: D("2026-10-23T20:00:00Z"), openedAt: D("2026-10-24T01:00:00Z") }), row({ sentAt: D("2026-10-21T06:00:00Z") })],
      D("2026-10-20T00:00:00Z"),
      D("2026-10-24T12:00:00Z"),
    )
    expect(daily.map((d) => d.day)).toEqual(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"])
    expect(daily.find((d) => d.day === "2026-10-24")).toEqual({ day: "2026-10-24", sent: 1, seen: 1, clicked: 0 })
    expect(dailyOf([row({ sentAt: D("2026-10-22T06:00:00Z") })], new Date(0), D("2026-10-24T12:00:00Z")).map((d) => d.day)).toEqual([
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
    ])
  })

  it("each campaign side by side, newest first, then personal emails as one line", () => {
    const lines = campaignLines(
      [
        row({ ref: "1", campaignId: "old", openedAt: D("2026-10-20T07:00:00Z") }),
        row({ ref: "2", campaignId: "new", via: "brevo" }),
        row({ ref: "3", campaignId: "new", via: "resend", clickedAt: D("2026-10-24T08:00:00Z"), openedAt: D("2026-10-24T08:00:00Z") }),
        row({ ref: "4", kind: "personal", campaignId: null, via: null }),
      ],
      [
        { id: "old", subject: "Old one", audience: "all", audienceValue: null, createdAt: D("2026-10-20T00:00:00Z") },
        { id: "new", subject: "New one", audience: "leads:all", audienceValue: null, createdAt: D("2026-10-24T00:00:00Z") },
      ],
    )
    expect(lines.map((l) => [l.id, l.subject, l.sent, l.seen, l.clicked, l.via])).toEqual([
      ["new", "New one", 2, 1, 1, "both"],
      ["old", "Old one", 1, 1, 0, "resend"],
      ["personal", "Personal emails", 1, 0, 0, null],
    ])
  })

  const ev = (refId: string, type: string, at: string, over: Record<string, unknown> = {}) => ({ kind: "campaign", refId, type, at: D(at), link: null, userAgent: null, ...over })

  it("the links people clicked: confirmed clicks only, ranked by people", () => {
    const events = [
      ev("a", "human", "2026-10-24T06:00:00Z", { link: "https://carouselabs.com/sign-up" }),
      ev("a", "human", "2026-10-24T06:05:00Z", { link: "https://carouselabs.com/sign-up" }),
      ev("b", "human", "2026-10-24T07:00:00Z", { link: "https://carouselabs.com/pricing" }),
      ev("c", "human", "2026-10-24T07:00:00Z", { link: "https://carouselabs.com/pricing" }),
      ev("d", "open", "2026-10-24T07:00:00Z"),
      // A link visit the browser never confirmed: not a click.
      ev("e", "click", "2026-10-24T07:00:00Z", { link: "https://carouselabs.com/sign-up" }),
    ]
    expect(topLinks(events)).toEqual([
      { link: "https://carouselabs.com/pricing", clicks: 2, people: 2 },
      { link: "https://carouselabs.com/sign-up", clicks: 2, people: 1 },
    ])
  })

  it("when they read it: weekday and hour in India time", () => {
    // Monday 23:00 UTC is Tuesday 4:30 AM in India.
    const grid = whenTheyRead([ev("a", "open", "2026-10-19T23:00:00Z"), ev("b", "human", "2026-10-19T23:10:00Z")])
    expect(grid[1][4]).toBe(2)
    expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(2)
  })

  it("where they read it: the app or device, each person once per app", () => {
    expect(emailApp(GMAIL)).toBe("Gmail")
    expect(emailApp(CHROME_IPHONE)).toBe("iPhone / iPad")
    expect(emailApp("Mozilla/5.0 (Windows NT 10.0; Microsoft Outlook 16.0; ms-office; MSOffice 16)")).toBe("Outlook (desktop)")
    expect(emailApp("Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile")).toBe("Android")
    expect(
      appsOf([
        ev("a", "open", "2026-10-24T06:00:00Z", { userAgent: GMAIL }),
        ev("a", "open", "2026-10-24T09:00:00Z", { userAgent: GMAIL }),
        ev("a", "human", "2026-10-24T06:01:00Z", { userAgent: CHROME_IPHONE }),
        ev("b", "open", "2026-10-24T06:00:00Z", { userAgent: GMAIL }),
        // Recorded before the checks: no signature, left out.
        ev("c", "open", "2026-10-24T06:00:00Z"),
      ]),
    ).toEqual([
      { app: "Gmail", people: 2 },
      { app: "iPhone / iPad", people: 1 },
    ])
  })

  it("leads who stopped: unsubscribed (our link too), bounced or blocked, spam", () => {
    expect(
      leadStops([
        { reason: null, count: 2 },
        { reason: "unsubscribed", count: 1 },
        { reason: "bounced", count: 3 },
        { reason: "blocked", count: 1 },
        { reason: "spam", count: 1 },
      ]),
    ).toEqual({ unsubscribed: 3, bounced: 4, spam: 1 })
  })

  it("a campaign's first 48 hours: people who had seen and clicked by each hour after their email went", () => {
    const timeline = first48Hours(
      [
        { ref: "a", sentAt: D("2026-10-24T05:00:00Z") },
        { ref: "b", sentAt: D("2026-10-24T05:00:00Z") },
      ],
      [ev("a", "open", "2026-10-24T05:30:00Z"), ev("a", "human", "2026-10-24T07:10:00Z"), ev("b", "open", "2026-10-25T03:00:00Z"), ev("x", "open", "2026-10-24T05:10:00Z")],
    )
    expect(timeline).toHaveLength(49)
    expect(timeline[0]).toEqual({ hour: 0, seen: 0, clicked: 0 })
    expect(timeline[1]).toEqual({ hour: 1, seen: 1, clicked: 0 })
    expect(timeline[3]).toEqual({ hour: 3, seen: 1, clicked: 1 })
    expect(timeline[22]).toEqual({ hour: 22, seen: 2, clicked: 1 })
  })
})

describe("one email's history", () => {
  const e = (type: string, at: string, verdict: string, over: Record<string, unknown> = {}) => ({
    kind: "campaign",
    refId: "r1",
    type,
    at: D(at),
    link: null,
    userAgent: null,
    verdict,
    reason: null,
    ...over,
  })

  it("each seen and click with its time, link and app; a scanner's burst as one line; a confirmed click once", () => {
    const items = activityOf([
      e("trap", "2026-10-24T10:54:05Z", "scanner", { reason: "Followed the hidden link only robots see" }),
      e("click", "2026-10-24T10:54:06Z", "scanner", { reason: "Several links at once", link: "https://carouselabs.com/a" }),
      e("click", "2026-10-24T10:54:06Z", "scanner", { reason: "Several links at once", link: "https://carouselabs.com/b" }),
      e("open", "2026-10-24T10:56:30Z", "person", { userAgent: GMAIL }),
      e("click", "2026-10-24T11:01:10Z", "unconfirmed", { link: "https://carouselabs.com/sign-up", userAgent: CHROME_IPHONE }),
      e("human", "2026-10-24T11:01:11Z", "person", { link: "https://carouselabs.com/sign-up", userAgent: CHROME_IPHONE }),
      e("click", "2026-10-24T12:00:00Z", "unconfirmed", { link: "https://carouselabs.com/pricing", userAgent: CHROME_IPHONE }),
      e("open", "2026-10-24T13:00:00Z", "apple", { reason: "Apple Mail opens emails by itself" }),
    ])
    expect(items.map((i) => [i.what, i.at.toISOString(), i.link, i.app, i.count])).toEqual([
      ["scanner", "2026-10-24T10:54:05.000Z", null, null, 3],
      ["seen", "2026-10-24T10:56:30.000Z", null, "Gmail", 1],
      ["clicked", "2026-10-24T11:01:11.000Z", "https://carouselabs.com/sign-up", "iPhone / iPad", 1],
      ["visited", "2026-10-24T12:00:00.000Z", "https://carouselabs.com/pricing", "iPhone / iPad", 1],
      ["apple", "2026-10-24T13:00:00.000Z", null, "Apple Mail", 1],
    ])
    expect(items[0].reason).toBe("Followed the hidden link only robots see")
  })

  it("the route: admins only, the email's send time and history", async () => {
    m.recipients = [{ id: "r1", campaignId: "c1", sentAt: D("2026-10-24T10:54:00Z") }]
    m.events = [e("open", "2026-10-24T10:56:30Z", "person", { userAgent: GMAIL })]
    const get = (q: string) => activityRoute(new Request(`https://admin.carouselabs.com/api/admin/email-activity?${q}`))
    const body = await (await get("kind=campaign&id=r1")).json()
    expect(body).toEqual({ sentAt: "2026-10-24T10:54:00.000Z", items: [expect.objectContaining({ what: "seen", app: "Gmail" })] })
    expect((await get("kind=campaign&id=gone")).status).toBe(404)
    expect((await get("kind=other&id=r1")).status).toBe(400)
    m.admin = null
    expect((await get("kind=campaign&id=r1")).status).toBe(403)
    m.admin = { email: "admin@carouselabs.com" }
  })
})

describe("loading the report", () => {
  beforeEach(() => {
    m.recipients = [
      { id: "u1", campaignId: "c1", userId: "user1", status: "sent", sentAt: D("2026-10-24T05:00:00Z"), updatedAt: D("2026-10-24T05:00:00Z"), openedAt: D("2026-10-24T06:00:00Z"), clickedAt: null, provider: null, scannedAt: null, autoOpenedAt: null },
      { id: "l1", campaignId: "c2", userId: null, status: "sent", sentAt: D("2026-10-24T05:00:00Z"), updatedAt: D("2026-10-24T05:00:00Z"), openedAt: null, clickedAt: null, provider: "brevo", scannedAt: D("2026-10-24T05:00:04Z"), autoOpenedAt: null },
      { id: "old", campaignId: "c1", userId: "user2", status: "sent", sentAt: D("2026-08-01T05:00:00Z"), updatedAt: D("2026-08-01T05:00:00Z"), openedAt: null, clickedAt: null, provider: null, scannedAt: null, autoOpenedAt: null },
    ]
    m.personal = [{ emailId: "p1", userId: "user1", createdAt: D("2026-10-23T05:00:00Z"), openedAt: null, clickedAt: null, openCount: 0, clickCount: 0, scannedAt: null, autoOpenedAt: null }]
    m.campaigns = [
      { id: "c1", subject: "For users", audience: "all", audienceValue: null, createdAt: D("2026-10-24T00:00:00Z") },
      { id: "c2", subject: "For leads", audience: "leads:all", audienceValue: null, createdAt: D("2026-10-24T00:00:00Z") },
    ]
    m.events = [
      { kind: "campaign", refId: "u1", type: "open", at: D("2026-10-24T06:00:00Z"), link: null, userAgent: GMAIL, verdict: "person" },
      { kind: "campaign", refId: "l1", type: "open", at: D("2026-10-24T05:00:04Z"), link: null, userAgent: "Mimecast", verdict: "scanner" },
      { kind: "campaign", refId: "l1", type: "open", at: D("2026-10-24T09:00:00Z"), link: null, userAgent: CHROME_IPHONE, verdict: "person" },
    ]
    m.stops = [{ stopReason: "bounced", _count: { _all: 2 } }]
    m.noLog = false
  })
  const range = { from: D("2026-10-01T00:00:00Z"), to: D("2026-10-25T00:00:00Z") }

  it("everything in the range: campaigns and personal emails, people's activity only, leads who stopped", async () => {
    const report = await emailReport({ ...range, kind: "all", via: "all", who: "all" })
    expect(report.totals).toEqual({ sent: 3, failed: 0, seen: 1, clicked: 0, scanned: 1, maybeApple: 0, unsubscribed: 0, bounced: 2, spam: 0 })
    expect(report.campaigns.map((c) => c.id)).toEqual(expect.arrayContaining(["c1", "c2", "personal"]))
    expect(report.apps).toEqual([
      { app: "Gmail", people: 1 },
      { app: "iPhone / iPad", people: 1 },
    ])
  })

  it("only users: the leads' campaign, its activity and lead stops are left out", async () => {
    const report = await emailReport({ ...range, kind: "all", via: "all", who: "users" })
    expect(report.totals).toMatchObject({ sent: 2, scanned: 0, bounced: 0 })
    expect(report.campaigns.map((c) => c.id)).toEqual(["c1", "personal"])
    // The leads' activity is left out too.
    expect(report.apps).toEqual([{ app: "Gmail", people: 1 }])
  })

  it("before the activity log exists, the numbers still come", async () => {
    m.noLog = true
    const report = await emailReport({ ...range, kind: "all", via: "all", who: "all" })
    expect(report.totals.sent).toBe(3)
    expect(report.links).toEqual([])
  })

  it("one campaign's first 48 hours", async () => {
    const activity = await campaignActivity("c1")
    expect(activity.timeline[1]).toEqual({ hour: 1, seen: 1, clicked: 0 })
  })
})

describe("the route's dates", () => {
  const get = (q: string) => reportRoute(new Request(`https://admin.carouselabs.com/api/admin/email-report?${q}`))

  it("is for admins only", async () => {
    m.admin = null
    expect((await get("days=30")).status).toBe(403)
    m.admin = { email: "admin@carouselabs.com" }
  })

  it("dates are India's days, both included; the last N days; or all time", async () => {
    const custom = await (await get("from=2026-10-01&to=2026-10-24")).json()
    expect(custom.filters).toMatchObject({ from: "2026-09-30T18:30:00.000Z", to: "2026-10-24T18:30:00.000Z" })
    const last = await (await get("days=7")).json()
    expect(new Date(last.filters.to).getTime() - new Date(last.filters.from).getTime()).toBe(7 * 86_400_000)
    expect((await (await get("kind=campaigns")).json()).filters.from).toBe(new Date(0).toISOString())
    expect((await get("from=2026-10-24&to=2026-10-01")).status).toBe(400)
    expect((await get("kind=everything")).status).toBe(400)
  })
})
