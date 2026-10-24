// Telling people from security scanners in seen and clicked
// (lib/emailScanners.ts, recorded by lib/emailTracking.ts): the rules one by
// one, then what a campaign row shows after realistic sequences of visits:
// a company's scanner checking the email the moment it arrives, a scanner
// that comes back hours later, Apple Mail opening it by itself, and a person
// reading and clicking. Against an in-memory activity log.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

const m = vi.hoisted(() => ({
  sentAt: null as Date | null,
  events: [] as Record<string, unknown>[],
  row: {} as Record<string, unknown>,
  plain: [] as { where: Record<string, unknown>; data: Record<string, unknown> }[],
  noLog: false,
}))

function matches(e: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === "object" && "gte" in (v as object)) return (e[k] as Date) >= (v as { gte: Date }).gte
    if (v && typeof v === "object" && "in" in (v as object)) return (v as { in: unknown[] }).in.includes(e[k])
    return e[k] === v
  })
}
const missingTable = () => new Prisma.PrismaClientKnownRequestError("The table does not exist", { code: "P2021", clientVersion: "5.22.0" })

vi.mock("@/lib/db", () => ({
  db: {
    emailCampaignRecipient: {
      findUnique: vi.fn(async () => ({ sentAt: m.sentAt })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(m.row, data)),
      updateMany: vi.fn(async (q: { where: Record<string, unknown>; data: Record<string, unknown> }) => m.plain.push(q)),
    },
    emailTrackEvent: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (m.noLog) throw missingTable()
        return m.events.filter((e) => matches(e, where)).map((e) => ({ ...e }))
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ev${m.events.length + 1}`, ...data }
        m.events.push(row)
        return row
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        for (const e of m.events.filter((x) => matches(x, where))) Object.assign(e, data)
      }),
    },
  },
}))

import { REASONS, judge, looksLikeApple, looksLikeRobot, rollUp, sweep, type JudgedEvent } from "@/lib/emailScanners"
import { recordEmailEvent } from "@/lib/emailTracking"

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
// Gmail (the app and the website) loading the image when the person opens the email.
const GMAIL = "Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)"
const SENT = new Date("2026-10-24T10:54:00.000Z")
const at = (seconds: number) => new Date(SENT.getTime() + seconds * 1000)

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-only-secret")
  m.sentAt = SENT
  m.events = []
  m.row = {}
  m.plain = []
  m.noLog = false
})

describe("the rules", () => {
  it("knows security tools and scripts by their signature, and leaves mail apps alone", () => {
    for (const robot of [
      "",
      "python-requests/2.31",
      "curl/8.4.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36",
      "Mimecast-URL-Protect/1.0",
      "Barracuda Sentinel (EE)",
      "Mozilla/5.0 (compatible; Proofpoint URL Defense)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "Go-http-client/1.1",
    ]) {
      expect(looksLikeRobot(robot)).toBe(true)
    }
    for (const person of [
      CHROME,
      IPHONE,
      "Mozilla/5.0 (Windows NT 10.0; Microsoft Outlook 16.0.17928; ms-office; MSOffice 16)",
      "Mozilla/5.0 (Windows NT 5.1; rv:11.0) Gecko Firefox/11.0 (via ggpht.com GoogleImageProxy)",
      "YahooMailProxy; https://help.yahoo.com/kb/yahoo-mail-proxy-SLN28749.html",
    ]) {
      expect(looksLikeRobot(person)).toBe(false)
    }
  })

  it("knows Apple Mail opening emails by itself", () => {
    expect(looksLikeApple("Mozilla/5.0", "203.0.113.1")).toBe(true)
    expect(looksLikeApple(IPHONE, "17.58.100.1")).toBe(true)
    expect(looksLikeApple(IPHONE, "203.0.113.1")).toBe(false)
  })

  const visit = (over: Partial<Parameters<typeof judge>[0]> = {}) => ({ type: "open" as const, at: at(3600), userAgent: CHROME, ip: "203.0.113.7", source: "A", ...over })
  const ctx = (prior: JudgedEvent[] = []) => ({ sentAt: SENT, prior })

  it("judges each visit: the hidden link, a peek, a signature, the first minute, a scanner's source", () => {
    expect(judge(visit({ type: "trap" }), ctx())).toEqual({ verdict: "scanner", reason: REASONS.trap })
    expect(judge(visit({ method: "HEAD" }), ctx())).toEqual({ verdict: "scanner", reason: REASONS.peek })
    expect(judge(visit({ userAgent: "curl/8.4.0" }), ctx())).toEqual({ verdict: "scanner", reason: REASONS.signature })
    expect(judge(visit({ at: at(59) }), ctx())).toEqual({ verdict: "scanner", reason: REASONS.firstMinute })
    expect(judge(visit({ at: at(61) }), ctx()).verdict).toBe("person")
    const scannerHere = { type: "trap", at: at(3000), source: "A", userAgent: CHROME, verdict: "scanner", reason: REASONS.trap }
    expect(judge(visit(), ctx([scannerHere]))).toEqual({ verdict: "scanner", reason: REASONS.sameSource })
    // Another source, or long after: not this scanner.
    expect(judge(visit({ source: "B" }), ctx([scannerHere])).verdict).toBe("person")
    expect(judge(visit({ at: at(3000 + 16 * 60) }), ctx([scannerHere])).verdict).toBe("person")
  })

  it("a visited link waits for the browser check; Apple Mail's open is only a maybe", () => {
    expect(judge(visit({ type: "click" }), ctx())).toEqual({ verdict: "unconfirmed", reason: REASONS.waiting })
    expect(judge(visit({ type: "human" }), ctx()).verdict).toBe("person")
    expect(judge(visit({ userAgent: "Mozilla/5.0" }), ctx())).toEqual({ verdict: "apple", reason: REASONS.apple })
  })

  const ev = (id: string, type: string, seconds: number, over: Partial<JudgedEvent> = {}): JudgedEvent => ({
    id,
    type,
    at: at(seconds),
    link: null,
    source: "A",
    userAgent: CHROME,
    verdict: type === "click" ? "unconfirmed" : "person",
    reason: null,
    ...over,
  })

  it("several links at once is a robot; the same link twice is a person's double click", () => {
    expect(sweep([ev("1", "click", 100, { link: "a" }), ev("2", "click", 101, { link: "b" })])).toEqual([[REASONS.burst, ["1", "2"]]])
    expect(sweep([ev("1", "click", 100, { link: "a" }), ev("2", "click", 101, { link: "a" })])).toEqual([])
    // Four links in ten seconds (one at a time, 3s apart): a robot; two of them: a reader.
    const four = ["a", "b", "c", "d"].map((link, i) => ev(String(i), "click", 100 + i * 3, { link }))
    expect(sweep(four)).toEqual([[REASONS.burst, ["0", "1", "2", "3"]]])
    expect(sweep(four.slice(0, 2))).toEqual([])
  })

  it("only proof of a robot marks its source: the first minute alone doesn't, nor Gmail's shared image servers", () => {
    expect(judge(visit({ at: at(18), userAgent: GMAIL }), ctx()).verdict).toBe("person")
    expect(judge(visit({ at: at(18) }), ctx()).reason).toBe(REASONS.firstMinute)
    const firstMinute = { type: "open", at: at(30), source: "A", userAgent: CHROME, verdict: "scanner", reason: REASONS.firstMinute }
    expect(judge(visit({ at: at(300) }), ctx([firstMinute])).verdict).toBe("person")
    const trap = { type: "trap", at: at(3000), source: "G", userAgent: CHROME, verdict: "scanner", reason: REASONS.trap }
    expect(judge(visit({ source: "G", userAgent: GMAIL }), ctx([trap])).verdict).toBe("person")
    expect(sweep([ev("t", "trap", 3000, { source: "G", verdict: "scanner", reason: REASONS.trap }), ev("g", "open", 3010, { source: "G", userAgent: GMAIL })])).toEqual([])
    expect(sweep([ev("f", "open", 30, { verdict: "scanner", reason: REASONS.firstMinute }), ev("p", "open", 300)])).toEqual([])
  })

  it("everything from a scanner's source around then was the scanner too, before or after", () => {
    const events = [
      ev("open", "open", 3590),
      ev("trap", "trap", 3600, { verdict: "scanner", reason: REASONS.trap }),
      ev("later", "human", 3620),
      ev("other", "human", 3620, { source: "B" }),
      ev("hours", "open", 3600 + 2 * 3600),
    ]
    expect(sweep(events)).toEqual([[REASONS.sameSource, ["open", "later"]]])
  })

  it("only a person's opens and confirmed clicks count; the scanner and Apple Mail are kept apart", () => {
    const summary = rollUp([
      ev("1", "open", 5, { verdict: "scanner", reason: REASONS.firstMinute }),
      ev("2", "open", 7200, { verdict: "apple", reason: REASONS.apple }),
      ev("3", "click", 9000),
      ev("4", "human", 9001),
      ev("5", "open", 9500),
      ev("6", "human", 9600),
    ])
    expect(summary).toEqual({
      openedAt: at(9001),
      lastOpenedAt: at(9500),
      openCount: 1,
      clickedAt: at(9001),
      lastClickedAt: at(9600),
      clickCount: 2,
      scannedAt: at(5),
      scanReason: REASONS.firstMinute,
      autoOpenedAt: at(7200),
    })
  })
})

describe("what a campaign shows after real sequences of visits", () => {
  const email = { kind: "campaign" as const, id: "r1" }
  const visit = (seconds: number, type: "open" | "click" | "human" | "trap", ip: string, link: string | null = null, userAgent = CHROME) =>
    recordEmailEvent(email, { type, at: at(seconds), link, visit: { method: "GET", userAgent, ip } })
  const LINKS = ["logo", "sign-in", "button", "site", "privacy", "terms"].map((p) => `https://carouselabs.com/${p}`)

  it("a company's scanner checking it the moment it arrives: not seen, not clicked", async () => {
    await visit(4, "trap", "40.94.1.1")
    await visit(4, "open", "40.94.1.1")
    for (const [i, link] of LINKS.entries()) await visit(5 + i * 0.2, "click", "40.94.1.1", link)
    expect(m.row).toMatchObject({ openedAt: null, openCount: 0, clickedAt: null, clickCount: 0, scannedAt: at(4) })
    expect(m.events.every((e) => e.verdict === "scanner")).toBe(true)
  })

  it("a scanner coming back hours later (and running scripts) is caught by its source and by clicking everything", async () => {
    const later = 3 * 3600
    await visit(later, "open", "52.1.1.1")
    for (const [i, link] of LINKS.slice(0, 3).entries()) {
      await visit(later + 1 + i * 0.3, "click", "52.1.1.1", link)
      await visit(later + 1.1 + i * 0.3, "human", "52.1.1.1", link)
    }
    await visit(later + 3, "trap", "52.1.1.1")
    expect(m.row).toMatchObject({ openedAt: null, clickedAt: null, clickCount: 0, scannedAt: at(later) })
  })

  it("the person reading it later, and clicking once: seen and clicked, apart from the scanner", async () => {
    await visit(4, "trap", "40.94.1.1")
    await visit(5, "click", "40.94.1.1", LINKS[2])
    await visit(2 * 3600, "open", "198.51.100.20", null, IPHONE)
    await visit(2 * 3600 + 40, "click", "198.51.100.20", LINKS[2], IPHONE)
    await visit(2 * 3600 + 41, "human", "198.51.100.20", LINKS[2], IPHONE)
    expect(m.row).toMatchObject({
      openedAt: at(2 * 3600),
      openCount: 1,
      clickedAt: at(2 * 3600 + 41),
      lastClickedAt: at(2 * 3600 + 41),
      clickCount: 1,
      scannedAt: at(4),
    })
  })

  it("the Gmail app opened straight away: seen (Gmail's servers only load it when the person opens it); a click counts too", async () => {
    await visit(18, "open", "66.249.84.1", null, GMAIL)
    // Gmail keeps the image, so opening it again sends nothing; a click still comes through.
    await visit(320, "click", "100.64.2.9", LINKS[2], IPHONE)
    await visit(321, "human", "100.64.2.9", LINKS[2], IPHONE)
    expect(m.row).toMatchObject({ openedAt: at(18), openCount: 1, clickedAt: at(321), clickCount: 1, scannedAt: null })
  })

  it("but a browser (not Gmail's servers) in the first minute is still the scanner, and Gmail opening it later still counts", async () => {
    await visit(10, "open", "40.94.1.1")
    await visit(300, "open", "66.249.84.1", null, GMAIL)
    expect(m.row).toMatchObject({ openedAt: at(300), openCount: 1, scannedAt: at(10) })
  })

  it("Apple Mail opening it by itself is a maybe, never seen", async () => {
    await visit(300, "open", "17.58.1.1", null, "Mozilla/5.0")
    expect(m.row).toMatchObject({ openedAt: null, autoOpenedAt: at(300), scannedAt: null })
  })

  it("before scripts/email-scanners.sql: counted as before, minus the first minute and plain robots", async () => {
    m.noLog = true
    await visit(5, "open", "40.94.1.1")
    await visit(300, "open", "40.94.1.1", null, "curl/8.4.0")
    await visit(300, "trap", "40.94.1.1")
    expect(m.plain).toEqual([])
    await visit(3600, "open", "198.51.100.20")
    expect(m.plain.map((u) => u.where)).toEqual([{ id: "r1", openedAt: null }, { id: "r1" }])
  })
})
