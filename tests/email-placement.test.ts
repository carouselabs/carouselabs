// "Where it landed" (lib/placement): each person's provider from their
// address, reading the test Gmail over IMAP (against a stand-in for Gmail's
// IMAP server: tabs, Important, Spam, folders in other languages, a wrong
// app password), what the column says for each person, and the test copies
// (lib/placement/tests.ts) against an in-memory database: sent like the
// send's people (a lead's or a user's), once per service, found in the test
// inbox, and nothing breaking before scripts/email-placement.sql is run.
// The same code runs in Dharma Mail, whose tests run it on a real Postgres.
import net from "node:net"
import { Prisma } from "@prisma/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type TestRowT = {
  id: string
  campaignId: string
  via: string
  inbox: string
  address: string
  status: string
  placement: string | null
  important: boolean
  error: string | null
  sentAt: Date
  checkedAt: Date | null
  foundAt: Date | null
}
const store = vi.hoisted(() => ({
  tests: [] as TestRowT[],
  recipients: [] as { id: string; campaignId: string; email: string; status: string; mailbox: string | null; provider: string | null }[],
  leads: [] as { email: string; unsubscribedAt: Date | null; stopReason: string | null }[],
  sqlMissing: false,
  next: 1,
}))

function missingTable() {
  return new Prisma.PrismaClientKnownRequestError("The table does not exist in the current database.", { code: "P2021", clientVersion: "5.22.0" })
}

// Enough of Prisma's where for lib/placement/tests.ts.
function matches(row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return (cond as Record<string, unknown>[]).some((w) => matches(row, w))
    const value = row[key]
    if (cond === null) return value === null || value === undefined
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { in?: unknown[]; lt?: Date; not?: unknown }
      if (c.in && !c.in.includes(value)) return false
      if (c.lt && !(value instanceof Date && value < c.lt)) return false
      if ("not" in c && c.not === null && (value === null || value === undefined)) return false
      return true
    }
    return value === cond
  })
}
const guard = () => {
  if (store.sqlMissing) throw missingTable()
}

vi.mock("@/lib/db", () => ({
  db: {
    emailPlacementTest: {
      create: vi.fn(async ({ data }: { data: Partial<TestRowT> }) => {
        guard()
        const row = { id: `t${store.next++}`, campaignId: "", via: "resend", inbox: "gmail", address: "", status: "waiting", placement: null, important: false, error: null, sentAt: new Date(), checkedAt: null, foundAt: null, ...data } as TestRowT
        store.tests.push(row)
        return row
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TestRowT> }) => Object.assign(store.tests.find((t) => t.id === where.id)!, data)),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<TestRowT> }) => {
        const hit = store.tests.filter((t) => matches(t, where))
        for (const t of hit) Object.assign(t, data)
        return { count: hit.length }
      }),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        guard()
        return store.tests.filter((t) => matches(t, where)).length
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        guard()
        return store.tests.filter((t) => matches(t, where)).sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime())
      }),
    },
    emailCampaignRecipient: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => store.recipients.filter((r) => matches(r, where)).map((r) => ({ ...r }))),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const hit = store.recipients.filter((r) => matches(r, where))
        for (const r of hit) Object.assign(r, data)
        return { count: hit.length }
      }),
    },
    lead: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => store.leads.filter((l) => matches(l, where))),
    },
  },
}))

import { mailboxFromMx, type Mailbox } from "@/lib/placement/mailbox"
import { mailboxesOf, mxOverHttps, providerOf } from "@/lib/placement/mailboxLookup"
import { findCopies, takeLine, words } from "@/lib/placement/gmailImap"
import { landingOf, testFor, type PlacementTestView } from "@/lib/placement/landing"
import { MISSING_AFTER_MS, placementReport, sendTestCopy, testAddress, testOnFirstSend, type TestPerson } from "@/lib/placement/tests"
import { readTrackingToken } from "@/lib/emailTracking"
import { readUnsubscribeToken } from "@/lib/leadUnsubscribe"

// ── A stand-in for Gmail's IMAP server ──────────────────────────────────

type Copy = { to: string; folder: "all" | "junk"; labels: string[]; tab: string | null; uid: number }
type GmailOptions = { password?: string; tabsSearchable?: boolean; allName?: string; junkName?: string; literalNames?: boolean; quotedLabels?: boolean }

function fakeGmail(copies: Copy[], opts: GmailOptions = {}) {
  const o = { password: "abcd efgh ijkl mnop".replace(/\s/g, ""), tabsSearchable: true, allName: "[Gmail]/All Mail", junkName: "[Gmail]/Spam", quotedLabels: true, ...opts }
  const commands: string[] = []
  const server = net.createServer((socket) => {
    let selected: "all" | "junk" | null = null
    let buffer = ""
    socket.write("* OK Gimap ready for requests\r\n")
    const folderLine = (flags: string, name: string) =>
      o.literalNames ? `* LIST (\\HasNoChildren ${flags}) "/" {${Buffer.byteLength(name)}}\r\n${name}\r\n` : `* LIST (\\HasNoChildren ${flags}) "/" "${name}"\r\n`
    socket.on("data", (data) => {
      buffer += data.toString()
      for (let end = buffer.indexOf("\r\n"); end >= 0; end = buffer.indexOf("\r\n")) {
        const line = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        commands.push(line)
        const [tag, ...rest] = line.split(" ")
        const cmd = rest.join(" ")
        const ok = (text = "Success") => socket.write(`${tag} OK ${text}\r\n`)
        const arg = (s: string) => JSON.parse(s) as string
        if (/^LOGIN /.test(cmd)) {
          const [, , password] = /^LOGIN (".*?") (".*")$/.exec(cmd)!.map((x, i) => (i ? arg(x) : x))
          if (password === o.password) ok("carouselabs@gmail.com authenticated (Success)")
          else socket.write(`${tag} NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)\r\n`)
        } else if (/^LIST /.test(cmd)) {
          socket.write(`* LIST (\\HasNoChildren) "/" "INBOX"\r\n${folderLine("\\All", o.allName)}${folderLine("\\Junk", o.junkName)}* LIST (\\HasNoChildren \\Trash) "/" "[Gmail]/Trash"\r\n`)
          ok()
        } else if (/^EXAMINE /.test(cmd)) {
          const name = arg(cmd.slice("EXAMINE ".length))
          selected = name === o.allName ? "all" : name === o.junkName ? "junk" : null
          if (!selected) socket.write(`${tag} NO [NONEXISTENT] Unknown Mailbox: ${name}\r\n`)
          else ok("[READ-ONLY] Selected")
        } else if (/^UID SEARCH X-GM-RAW /.test(cmd)) {
          const query = arg(cmd.slice("UID SEARCH X-GM-RAW ".length))
          const to = /deliveredto:(\S+)/.exec(query)![1]
          const tab = /category:(\w+)/.exec(query)?.[1]
          const hits = copies.filter((c) => c.folder === selected && c.to === to && (!tab || (o.tabsSearchable && c.tab === tab)))
          socket.write(`* SEARCH${hits.map((h) => ` ${h.uid}`).join("")}\r\n`)
          ok("SEARCH completed (Success)")
        } else if (/^UID FETCH (\d+) \(X-GM-LABELS\)$/.test(cmd)) {
          const uid = Number(/^UID FETCH (\d+)/.exec(cmd)![1])
          const copy = copies.find((c) => c.uid === uid && c.folder === selected)!
          const labels = copy.labels.map((l) => (o.quotedLabels ? JSON.stringify(l) : l)).join(" ")
          socket.write(`* 1 FETCH (X-GM-LABELS (${labels}) UID ${uid})\r\n`)
          ok()
        } else if (/^LOGOUT$/.test(cmd)) {
          socket.write("* BYE LOGOUT Requested\r\n")
          ok()
          socket.end()
        } else socket.write(`${tag} BAD Unknown command\r\n`)
      }
    })
  })
  return {
    commands,
    async start() {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
      const { port } = server.address() as net.AddressInfo
      return () => net.connect({ port, host: "127.0.0.1" })
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

const PASSWORD = "abcd efgh ijkl mnop"
const USER = "carouselabs@gmail.com"

describe("each person's provider", () => {
  it("knows free mail by its domain, and a company's by who receives its mail", async () => {
    expect(mailboxFromMx(["aspmx.l.google.com.", "alt1.aspmx.l.google.com"])).toBe("google-workspace")
    expect(mailboxFromMx(["smtp.google.com"])).toBe("google-workspace")
    expect(mailboxFromMx(["centene-com.mail.protection.outlook.com"])).toBe("microsoft-365")
    expect(mailboxFromMx(["mta5.am0.yahoodns.net"])).toBe("yahoo")
    expect(mailboxFromMx(["mx01.mail.icloud.com"])).toBe("icloud")
    expect(mailboxFromMx(["mx.zoho.in"])).toBe("zoho")
    expect(mailboxFromMx(["us-smtp-inbound-1.mimecast.com"])).toBe("other")
    expect(mailboxFromMx([])).toBe("other")

    const asked: string[] = []
    const look = async (domain: string): Promise<Mailbox> => {
      asked.push(domain)
      return domain === "centene.com" ? "microsoft-365" : "google-workspace"
    }
    const found = await mailboxesOf(["Priya@Gmail.com", "sam@hotmail.com", "lee@centene.com", "raj@acme.io", "x@yahoo.co.in", "y@acme.io"], look)
    expect(Object.fromEntries(found)).toEqual({
      "priya@gmail.com": "gmail",
      "sam@hotmail.com": "outlook",
      "lee@centene.com": "microsoft-365",
      "raj@acme.io": "google-workspace",
      "x@yahoo.co.in": "yahoo",
      "y@acme.io": "google-workspace",
    })
    // Free mail needs no lookup, and each other domain is looked up once.
    expect(asked.sort()).toEqual(["acme.io", "centene.com"])
  })
})

describe("reading the test Gmail", () => {
  it("reads IMAP answers: a {n} literal folded in, quoted and plain words", () => {
    const buf = Buffer.from('* LIST (\\All) "/" {16}\r\n[Gmail]/All Mail\r\nrest')
    const taken = takeLine(buf)!
    expect(taken.line).toBe('* LIST (\\All) "/" "[Gmail]/All Mail"')
    expect(taken.rest.toString()).toBe("rest")
    expect(takeLine(Buffer.from("* OK partial"))).toBeNull()
    expect(takeLine(Buffer.from("* LIST () {20}\r\nshort"))).toBeNull()
    expect(words('"\\\\Important" \\Inbox "My \\"label\\""')).toEqual(["\\Important", "\\Inbox", 'My "label"'])
  })

  const copies: Copy[] = [
    { to: "carouselabs+cl1@gmail.com", folder: "all", labels: ["\\Inbox", "\\Important"], tab: "promotions", uid: 11 },
    { to: "carouselabs+cl2@gmail.com", folder: "all", labels: ["\\Inbox"], tab: "primary", uid: 12 },
    { to: "carouselabs+cl3@gmail.com", folder: "junk", labels: [], tab: null, uid: 3 },
    { to: "carouselabs+cl4@gmail.com", folder: "all", labels: ["Receipts"], tab: "updates", uid: 14 },
    { to: "carouselabs+cl6@gmail.com", folder: "all", labels: ["\\Inbox"], tab: "updates", uid: 16 },
  ]

  it("finds each copy: its tab, Important, Spam, skipped the inbox, or not there yet; reading only", async () => {
    const gmail = fakeGmail(copies)
    const connect = await gmail.start()
    try {
      const found = await findCopies({ user: USER, password: PASSWORD, addresses: copies.map((c) => c.to).concat("carouselabs+cl5@gmail.com"), connect })
      expect(Object.fromEntries(found)).toEqual({
        "carouselabs+cl1@gmail.com": { placement: "promotions", important: true },
        "carouselabs+cl2@gmail.com": { placement: "primary", important: false },
        "carouselabs+cl3@gmail.com": { placement: "spam", important: false },
        "carouselabs+cl4@gmail.com": { placement: "archived", important: false },
        "carouselabs+cl6@gmail.com": { placement: "updates", important: false },
        "carouselabs+cl5@gmail.com": null,
      })
      // It only looked: no SELECT (read-write), STORE, COPY, MOVE or EXPUNGE.
      const verbs = gmail.commands.map((c) => c.split(" ").slice(1, 3).join(" "))
      expect(verbs.every((v) => /^(LOGIN|LIST|EXAMINE|UID SEARCH|UID FETCH|LOGOUT)/.test(v))).toBe(true)
      // The app password goes in without its spaces.
      expect(gmail.commands[0]).toBe(`a1 LOGIN "${USER}" "abcdefghijklmnop"`)
    } finally {
      await gmail.stop()
    }
  })

  it("says Inbox (tab not known) when tabs can't be searched, rather than guess Primary", async () => {
    const gmail = fakeGmail(copies, { tabsSearchable: false, quotedLabels: false })
    const connect = await gmail.start()
    try {
      const found = await findCopies({ user: USER, password: PASSWORD, addresses: ["carouselabs+cl1@gmail.com"], connect })
      expect(found.get("carouselabs+cl1@gmail.com")).toEqual({ placement: "inbox", important: true })
    } finally {
      await gmail.stop()
    }
  })

  it("finds All Mail and Spam by their flags when Gmail isn't in English", async () => {
    const gmail = fakeGmail(copies, { allName: "[Gmail]/Tous les messages", junkName: "[Gmail]/Spam français", literalNames: true })
    const connect = await gmail.start()
    try {
      const found = await findCopies({ user: USER, password: PASSWORD, addresses: ["carouselabs+cl2@gmail.com", "carouselabs+cl3@gmail.com"], connect })
      expect(found.get("carouselabs+cl2@gmail.com")?.placement).toBe("primary")
      expect(found.get("carouselabs+cl3@gmail.com")?.placement).toBe("spam")
    } finally {
      await gmail.stop()
    }
  })

  it("says plainly when Gmail turns the app password down", async () => {
    const gmail = fakeGmail(copies)
    const connect = await gmail.start()
    try {
      await expect(findCopies({ user: USER, password: "wrong", addresses: ["carouselabs+cl1@gmail.com"], connect })).rejects.toThrow(/didn't accept the test inbox's app password/)
    } finally {
      await gmail.stop()
    }
  })
})

describe("what the column says", () => {
  const test = (over: Partial<PlacementTestView>): PlacementTestView => ({
    id: "t1",
    via: "brevo",
    inbox: "gmail",
    status: "found",
    placement: "promotions",
    important: false,
    error: null,
    sentAt: "2026-10-25T10:00:00Z",
    checkedAt: null,
    ...over,
  })
  const person = (over: Partial<Parameters<typeof landingOf>[0]> = {}) => ({
    status: "sent",
    sentAt: "2026-10-25T10:00:00Z",
    openedAt: null,
    clickedAt: null,
    mailbox: "gmail" as Mailbox,
    via: "brevo",
    stop: null,
    ...over,
  })
  const tests = [test({})]

  it("what's known for sure first: bounced, marked as spam, clicked, seen", () => {
    expect(landingOf(person({ stop: { reason: "bounced", at: "2026-10-25T10:01:00Z" } }), tests)).toMatchObject({ label: "Bounced", tone: "bad" })
    expect(landingOf(person({ stop: { reason: "spam", at: "2026-10-25T11:00:00Z" } }), tests)).toMatchObject({ label: "Marked as spam", tone: "bad" })
    expect(landingOf(person({ clickedAt: "2026-10-25T12:00:00Z", openedAt: "2026-10-25T11:00:00Z" }), tests)).toEqual({ label: "Clicked", detail: "Gmail test: Promotions tab", tone: "good" })
    expect(landingOf(person({ openedAt: "2026-10-25T11:00:00Z" }), tests)).toMatchObject({ label: "Seen", tone: "good" })
    expect(landingOf(person({ openedAt: "2026-10-25T11:00:00Z" }), [])).toEqual({ label: "Seen", detail: "It reached them", tone: "good" })
    // Stopped before this email went out: not about this email.
    expect(landingOf(person({ stop: { reason: "bounced", at: "2026-10-24T10:00:00Z" } }), tests).label).toBe("Gmail: Promotions tab")
  })

  it("otherwise the test copy at their kind of inbox: Gmail's for Gmail and Google Workspace", () => {
    expect(landingOf(person(), tests)).toEqual({ label: "Gmail: Promotions tab", detail: "From the test copy", tone: "warn" })
    expect(landingOf(person({ mailbox: "google-workspace" }), [test({ placement: "primary" })])).toMatchObject({ label: "Google Workspace: Primary", tone: "good" })
    expect(landingOf(person(), [test({ placement: "spam" })])).toMatchObject({ label: "Gmail: Spam", tone: "bad" })
    expect(landingOf(person({ mailbox: "microsoft-365" }), tests)).toMatchObject({ label: "Microsoft 365: not tested", tone: "muted" })
    expect(landingOf(person(), [test({ status: "waiting", placement: null })])).toMatchObject({ label: "Gmail: Checking…" })
    expect(landingOf(person(), [test({ status: "missing", placement: null })])).toMatchObject({ label: "Gmail: Never arrived", tone: "bad" })
    expect(landingOf(person({ status: "pending" }), tests)).toEqual({ label: "—", tone: "muted" })
    // The newest test, of the same sending service.
    const older = test({ id: "old", placement: "spam", sentAt: "2026-10-20T10:00:00Z" })
    expect(testFor([older, test({ id: "new" })], "gmail", "brevo")?.id).toBe("new")
    expect(testFor([test({ via: "resend" })], "gmail", "brevo")).toBeNull()
  })
})

// ── Test copies, against an in-memory database ──────────────────────────

describe("a campaign's test copies", () => {
  let gmail: ReturnType<typeof fakeGmail> | null = null
  const sent: { person: TestPerson; prefix: string }[] = []
  const send = async (person: TestPerson, prefix: string) => {
    sent.push({ person, prefix })
    return { sent: 1, failed: 0, failedTo: [] }
  }

  beforeEach(() => {
    vi.stubEnv("CLERK_SECRET_KEY", "test-only-secret")
    vi.stubEnv("PLACEMENT_GMAIL_USER", USER)
    vi.stubEnv("PLACEMENT_GMAIL_APP_PASSWORD", PASSWORD)
    store.tests = []
    store.recipients = []
    store.leads = []
    store.sqlMissing = false
    sent.length = 0
  })
  afterEach(async () => {
    vi.unstubAllEnvs()
    await gmail?.stop()
    gmail = null
  })

  it("a lead's copy: named there, tracked, with an Unsubscribe link, all pointing at no one; a user's has no Unsubscribe", async () => {
    const lead = await sendTestCopy({ campaignId: "c1", via: "brevo", asLead: true, send })
    expect(lead).toMatchObject({ via: "brevo", inbox: "gmail", status: "waiting" })
    const copy = sent[0].person
    expect(copy.email).toMatch(/^carouselabs\+cl[0-9a-f]{12}@gmail\.com$/)
    expect(copy.userId).toBeNull()
    expect(copy.values?.firstName).toBe("there")
    expect(readTrackingToken(copy.trackingToken!)).toEqual({ kind: "campaign", id: `placement-${lead!.id}` })
    expect(readUnsubscribeToken(copy.unsubscribeUrl!.split("/").pop()!)).toBe(`placement-${lead!.id}`)
    expect(sent[0].prefix).toBe(`placement-${lead!.id}`)
    expect(store.tests[0].address).toBe(copy.email)

    await sendTestCopy({ campaignId: "c1", via: "resend", asLead: false, send })
    expect(sent[1].person).not.toHaveProperty("unsubscribeUrl")
    expect(sent[1].person).not.toHaveProperty("values")
    expect(sent[1].person.trackingToken).toBeTruthy()
  })

  it("once per service per campaign; nothing without a test inbox; a failed copy is kept with why", async () => {
    await testOnFirstSend({ campaignId: "c1", via: "resend", asLead: false, send })
    await testOnFirstSend({ campaignId: "c1", via: "resend", asLead: false, send })
    await testOnFirstSend({ campaignId: "c1", via: "brevo", asLead: true, send })
    await testOnFirstSend({ campaignId: "c2", via: "resend", asLead: false, send })
    expect(store.tests.map((t) => [t.campaignId, t.via])).toEqual([
      ["c1", "resend"],
      ["c1", "brevo"],
      ["c2", "resend"],
    ])

    vi.stubEnv("PLACEMENT_GMAIL_APP_PASSWORD", "")
    await testOnFirstSend({ campaignId: "c3", via: "resend", asLead: false, send })
    expect(store.tests).toHaveLength(3)
    vi.stubEnv("PLACEMENT_GMAIL_APP_PASSWORD", PASSWORD)

    const refused = await sendTestCopy({ campaignId: "c4", via: "brevo", asLead: true, send: async () => ({ sent: 0, failed: 1, failedTo: ["x"], error: "Brevo: sender is not valid" }) })
    expect(refused).toMatchObject({ status: "failed", error: "Brevo: sender is not valid" })
    const thrown = await sendTestCopy({
      campaignId: "c5",
      via: "resend",
      asLead: false,
      send: async () => {
        throw new Error("Resend is down")
      },
    })
    expect(thrown).toMatchObject({ status: "failed", error: "Resend is down" })
  })

  it("before scripts/email-placement.sql: campaigns send as before, and the page says to run it", async () => {
    store.sqlMissing = true
    await expect(testOnFirstSend({ campaignId: "c1", via: "resend", asLead: false, send })).resolves.toBeUndefined()
    expect(sent).toHaveLength(0)
    expect(await placementReport("c1")).toEqual({ inbox: { connected: true, address: USER }, setupMissing: true, tests: [], people: {} })
  })

  it("the page finds where each copy landed, and each person gets their service's and inbox's result", async () => {
    await sendTestCopy({ campaignId: "c1", via: "resend", asLead: false, send })
    await sendTestCopy({ campaignId: "c1", via: "brevo", asLead: true, send })
    const [toUsers, toLeads] = store.tests
    gmail = fakeGmail([
      { to: toUsers.address, folder: "all", labels: ["\\Inbox"], tab: "primary", uid: 1 },
      { to: toLeads.address, folder: "all", labels: ["\\Inbox", "\\Important"], tab: "promotions", uid: 2 },
    ])
    const connect = await gmail.start()
    store.recipients = [
      { id: "r1", campaignId: "c1", email: "user@gmail.com", status: "sent", mailbox: null, provider: null },
      { id: "r2", campaignId: "c1", email: "lead@gmail.com", status: "sent", mailbox: null, provider: "brevo" },
      { id: "r3", campaignId: "c1", email: "lead@centene.com", status: "sent", mailbox: null, provider: "brevo" },
      { id: "r4", campaignId: "c1", email: "spam@acme.io", status: "sent", mailbox: null, provider: "brevo" },
      { id: "r5", campaignId: "c1", email: "later@acme.io", status: "pending", mailbox: null, provider: null },
    ]
    const sentAt = toUsers.sentAt
    store.leads = [{ email: "spam@acme.io", unsubscribedAt: new Date(sentAt.getTime() + 60_000), stopReason: "spam" }]
    const look = async (domain: string): Promise<Mailbox> => (domain === "centene.com" ? "microsoft-365" : "google-workspace")

    const report = await placementReport("c1", { now: new Date(sentAt.getTime() + 30_000), connect, look })
    expect(report.tests.map((t) => [t.via, t.status, t.placement, t.important])).toEqual([
      ["resend", "found", "primary", false],
      ["brevo", "found", "promotions", true],
    ])
    const label = (id: string) =>
      landingOf({ status: store.recipients.find((r) => r.id === id)!.status, sentAt, openedAt: null, clickedAt: null, ...report.people[id] }, report.tests).label
    expect(["r1", "r2", "r3", "r4", "r5"].map(label)).toEqual(["Gmail: Primary", "Gmail: Promotions tab", "Microsoft 365: not tested", "Marked as spam", "—"])
    // Providers are kept for the people sent; the not-yet-sent wait.
    expect(store.recipients.map((r) => r.mailbox)).toEqual(["gmail", "gmail", "microsoft-365", "google-workspace", null])
  })

  it("not there after 30 minutes: never arrived", async () => {
    await sendTestCopy({ campaignId: "c1", via: "resend", asLead: false, send })
    gmail = fakeGmail([])
    const connect = await gmail.start()
    const sentAt = store.tests[0].sentAt
    expect((await placementReport("c1", { now: new Date(sentAt.getTime() + 60_000), connect })).tests[0].status).toBe("waiting")
    expect((await placementReport("c1", { now: new Date(sentAt.getTime() + MISSING_AFTER_MS + 60_000), connect })).tests[0].status).toBe("missing")
  })

  it("test addresses are unique and end up in the test inbox", () => {
    const a = testAddress(USER)
    expect(a).toMatch(/^carouselabs\+cl[0-9a-f]{12}@gmail\.com$/)
    expect(testAddress(USER)).not.toBe(a)
  })
})

describe("looking up a provider when DNS can't answer", () => {
  const refused = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
  const noData = Object.assign(new Error("queryMx ENODATA"), { code: "ENODATA" })

  it("DNS first; no mail servers is a real answer; a refused DNS asks over HTTPS; both failing is 'not known yet'", async () => {
    expect(await providerOf("acme.io", { mx: async () => ["aspmx.l.google.com"] })).toBe("google-workspace")
    expect(await providerOf("nomail.io", { mx: async () => Promise.reject(noData), https: async () => ["x"] })).toBe("other")
    expect(await providerOf("centene.com", { mx: async () => Promise.reject(refused), https: async () => ["centene-com.mail.protection.outlook.com"] })).toBe("microsoft-365")
    expect(await providerOf("acme.io", { mx: async () => Promise.reject(refused), https: async () => null })).toBeNull()
  })

  it("reads Cloudflare's DNS-over-HTTPS answer, and says when it couldn't answer", async () => {
    const answer = (body: unknown, status = 200) => vi.fn(async () => Response.json(body, { status })) as unknown as typeof fetch
    expect(await mxOverHttps("acme.io", answer({ Status: 0, Answer: [{ type: 15, data: "10 aspmx.l.google.com." }, { type: 5, data: "cname.example." }] }))).toEqual(["aspmx.l.google.com."])
    expect(await mxOverHttps("nope.invalid", answer({ Status: 3 }))).toEqual([])
    expect(await mxOverHttps("acme.io", answer({ Status: 2 }))).toBeNull()
    expect(await mxOverHttps("acme.io", answer({}, 500))).toBeNull()
    expect(await mxOverHttps("acme.io", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch)).toBeNull()
  })

  it("an address whose provider isn't known yet stays unknown, not 'other'", async () => {
    const found = await mailboxesOf(["a@gmail.com", "b@acme.io"], async () => null)
    expect(Object.fromEntries(found)).toEqual({ "a@gmail.com": "gmail", "b@acme.io": null })
    expect(landingOf({ status: "sent", sentAt: null, openedAt: null, clickedAt: null, mailbox: null, via: "brevo" }, [])).toMatchObject({ label: "Not known yet" })
  })
})
