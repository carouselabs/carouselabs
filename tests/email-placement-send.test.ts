// "Where it landed": sending a campaign batch (lib/campaigns.ts) also sends
// the first test copy through each service it used — Resend for users, like
// a user's copy, and Brevo for leads, like a lead's — the same email, sender
// and replies as theirs; and the test copy never counts as anyone on the
// list. Against an in-memory list, with lib/placement/tests.ts watched.
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Resend } from "resend"
import type { BatchMailer } from "@/lib/emailBatchSend"

type Row = { id: string; campaignId: string; userId: string | null; email: string; name: string | null; status: string; sentAt: Date | null; error: string | null; batchId: string | null; provider?: string | null; updatedAt: Date }

const store = vi.hoisted(() => ({
  rows: [] as Row[],
  sends: [] as { mailer: string; to: string[]; subject: string; replyTo: string | null; people: Record<string, unknown>[] }[],
  tests: [] as { campaignId: string; via: string; asLead: boolean }[],
}))

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key]
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { in?: unknown[]; lt?: Date; gte?: Date }
      if (c.in && !c.in.includes(value)) return false
      if (c.lt && !(value instanceof Date && value < c.lt)) return false
      if (c.gte && !(value instanceof Date && value >= c.gte)) return false
      return true
    }
    if (cond === null) return value === null || value === undefined
    return value === cond
  })
}

vi.mock("@/lib/db", () => ({
  db: {
    emailCampaign: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "c1" ? { id: "c1", subject: "What's new", body: "Hi {{firstName}}", status: "active", design: null, sendVia: null, sendFrom: null, replyTo: "team@carouselabs.com" } : null,
      ),
    },
    emailCampaignRecipient: {
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const hit = store.rows.filter((r) => matches(r, where))
        for (const r of hit) Object.assign(r, data, { updatedAt: new Date() })
        return { count: hit.length }
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => store.rows.filter((r) => matches(r, where))),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => store.rows.filter((r) => matches(r, where)).length),
    },
    lead: {
      findMany: vi.fn(async ({ where }: { where: { email: { in: string[] } } }) =>
        where.email.in.filter((e) => e.startsWith("lead")).map((email, i) => ({ id: `l${i}`, email, firstName: "Lea", lastName: null, name: null, fields: {}, unsubscribedAt: null })),
      ),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}))
vi.mock("@/lib/auditLog", () => ({ logAdminAction: vi.fn(async () => {}) }))
vi.mock("@/lib/broadcast", () => ({
  resolveRecipients: vi.fn(),
  sendUserBroadcast: vi.fn(async (mailer: { label?: string }, _from: string, recipients: Record<string, unknown>[], subject: string, _body: string, _prefix: string, opts: { replyTo?: string | null }) => {
    store.sends.push({ mailer: mailer.label ?? "Resend", to: recipients.map((r) => r.email as string), subject, replyTo: opts.replyTo ?? null, people: recipients })
    return { sent: recipients.length, failed: 0, failedTo: [] }
  }),
}))
// The test copies themselves are tested in tests/email-placement.test.ts:
// here, only that each service's first send asks for one, and how it's sent.
vi.mock("@/lib/placement/tests", () => ({
  sendTestCopy: vi.fn(async (input: { campaignId: string; via: string; asLead: boolean }) => {
    store.tests.push({ campaignId: input.campaignId, via: input.via, asLead: input.asLead })
    return { id: "t", status: "waiting" }
  }),
  testOnFirstSend: vi.fn(async (input: { campaignId: string; via: string; asLead: boolean; send: (p: Record<string, unknown>, prefix: string) => Promise<unknown> }) => {
    store.tests.push({ campaignId: input.campaignId, via: input.via, asLead: input.asLead })
    await input.send({ userId: null, email: `carouselabs+cl${input.via}@gmail.com`, trackingToken: "tok", ...(input.asLead ? { values: { firstName: "there" }, unsubscribeUrl: "https://carouselabs.com/api/unsubscribe/placement-t" } : {}) }, "placement-t")
  }),
}))

import { sendCampaignBatch, sendPlacementTests } from "@/lib/campaigns"

const resend = { label: "Resend" } as unknown as Resend
const brevo = { label: "Brevo" } as unknown as BatchMailer
const person = (id: string, email: string, userId: string | null): Row => ({ id, campaignId: "c1", userId, email, name: null, status: "pending", sentAt: null, error: null, batchId: null, provider: null, updatedAt: new Date() })

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-only-secret")
  store.rows = [person("u1", "ana@example.test", "user1"), person("u2", "ben@example.test", "user2"), person("l1", "lead1@example.test", null), person("l2", "lead2@example.test", null)]
  store.sends = []
  store.tests = []
})

const send = (ids: string[], withBrevo = true) =>
  sendCampaignBatch({ campaignId: "c1", recipientIds: ids, adminEmail: "admin@carouselabs.com", resend, brevo: withBrevo ? brevo : null, from: "CarouseLabs <support@carouselabs.com>" })

describe("a campaign's test copies", () => {
  it("each service's send asks for a test copy, like that send's people, through the same service", async () => {
    const result = await send(["u1", "u2", "l1", "l2"])
    expect(result.sent).toBe(4)
    expect(store.tests).toEqual([
      { campaignId: "c1", via: "resend", asLead: false },
      { campaignId: "c1", via: "brevo", asLead: true },
    ])
    // Each copy went the same way as its people: same service, subject and replies.
    expect(store.sends.map((s) => [s.mailer, s.to])).toEqual([
      ["Resend", ["ana@example.test", "ben@example.test"]],
      ["Brevo", ["lead1@example.test", "lead2@example.test"]],
      ["Resend", ["carouselabs+clresend@gmail.com"]],
      ["Brevo", ["carouselabs+clbrevo@gmail.com"]],
    ])
    expect(new Set(store.sends.map((s) => s.subject))).toEqual(new Set(["What's new"]))
    expect(store.sends.every((s) => s.replyTo === "team@carouselabs.com")).toBe(true)
    expect(store.sends[3].people[0]).toMatchObject({ userId: null, trackingToken: "tok", unsubscribeUrl: expect.stringContaining("placement-"), byBrevo: true })
    // The test copies aren't anyone on the list.
    expect(store.rows.map((r) => r.status)).toEqual(["sent", "sent", "sent", "sent"])
  })

  it("only a service that sent something asks: users only, or nothing when nothing went", async () => {
    await send(["u1"])
    expect(store.tests).toEqual([{ campaignId: "c1", via: "resend", asLead: false }])
    store.tests = []
    await send(["u1"])
    expect(store.tests).toEqual([])
  })

  it("Test again: a copy through each service its people went through, a lead's where leads were", async () => {
    await send(["u1", "u2", "l1", "l2"])
    store.tests = []
    await sendPlacementTests({ campaignId: "c1", resend, brevo, from: "CarouseLabs <support@carouselabs.com>" })
    expect(store.tests).toEqual([
      { campaignId: "c1", via: "resend", asLead: false },
      { campaignId: "c1", via: "brevo", asLead: true },
    ])
    // Before anyone is sent: the service it would use (users here: Resend).
    store.rows.forEach((r) => Object.assign(r, { status: "pending", provider: null }))
    store.tests = []
    await sendPlacementTests({ campaignId: "c1", resend, brevo, from: "CarouseLabs <support@carouselabs.com>" })
    expect(store.tests).toEqual([{ campaignId: "c1", via: "resend", asLead: false }])
  })
})
