// Email campaigns (Admin → Broadcasts → Campaigns): pick people in batches,
// they're marked sent, nobody gets the email twice, and sending stops at the
// day's limit (Resend's free plan). lib/campaignRules.ts + lib/campaigns.ts,
// against an in-memory list instead of the database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Resend } from "resend"

type Row = {
  id: string
  campaignId: string
  userId: string | null
  email: string
  name: string | null
  status: string
  sentAt: Date | null
  error: string | null
  batchId: string | null
  updatedAt: Date
}

const store = vi.hoisted(() => ({
  campaigns: [] as { id: string; subject: string; body: string; status: string; design?: unknown }[],
  designedTo: [] as string[][],
  rows: [] as Row[],
  sentTo: [] as string[][],
  failNext: null as null | { failedTo: string[]; error: string },
}))

// Enough of Prisma's `where` for the queries lib/campaigns.ts makes.
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
    return value === cond
  })
}

vi.mock("@/lib/db", () => ({
  db: {
    emailCampaign: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => store.campaigns.find((c) => c.id === where.id) ?? null),
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
  },
}))
vi.mock("@/lib/auditLog", () => ({ logAdminAction: vi.fn(async () => {}) }))
vi.mock("@/lib/emailDesignRender", () => ({
  sendDesignedEmails: vi.fn(async (_resend: unknown, _from: string, recipients: { email: string }[]) => {
    store.designedTo.push(recipients.map((r) => r.email))
    return { sent: recipients.length, failed: 0, failedTo: [] }
  }),
}))
vi.mock("@/lib/broadcast", () => ({
  resolveRecipients: vi.fn(),
  // Records who each send went to; fails the addresses in store.failNext.
  sendUserBroadcast: vi.fn(async (_resend: unknown, _from: string, recipients: { email: string }[]) => {
    store.sentTo.push(recipients.map((r) => r.email))
    const fail = store.failNext
    store.failNext = null
    const failedTo = fail ? recipients.map((r) => r.email).filter((e) => fail.failedTo.includes(e)) : []
    return { sent: recipients.length - failedTo.length, failed: failedTo.length, failedTo, ...(fail ? { error: fail.error } : {}) }
  }),
}))

import { CAMPAIGN_DAILY_LIMIT, allowanceLeft, campaignProgress, nextUnsent } from "@/lib/campaignRules"
import { CampaignError, sendCampaignBatch } from "@/lib/campaigns"

const resend = {} as Resend
const send = (recipientIds: string[], campaignId = "c1") =>
  sendCampaignBatch({ campaignId, recipientIds, adminEmail: "admin@carouselabs.com", resend, from: "CarouseLabs <support@carouselabs.com>" })

function seed(people: number, campaignStatus = "active") {
  store.campaigns = [{ id: "c1", subject: "What's stopping you?", body: "Hi {{firstName}}", status: campaignStatus }]
  store.rows = Array.from({ length: people }, (_, i) => ({
    id: `r${i}`,
    campaignId: "c1",
    userId: `u${i}`,
    email: `person${i}@example.test`,
    name: null,
    status: "pending",
    sentAt: null,
    error: null,
    batchId: null,
    updatedAt: new Date(),
  }))
  store.sentTo = []
  store.designedTo = []
  store.failNext = null
}

const ids = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => `r${from + i}`)
const statusOf = (id: string) => store.rows.find((r) => r.id === id)!.status

describe("campaign rules", () => {
  it("'next 10' takes the first people not sent yet, in list order, skipping ones already ticked and failed ones", () => {
    const rows = [
      { id: "a", status: "sent" },
      { id: "b", status: "pending" },
      { id: "c", status: "failed" },
      { id: "d", status: "pending" },
      { id: "e", status: "pending" },
      { id: "f", status: "sending" },
      { id: "g", status: "pending" },
    ]
    expect(nextUnsent(rows, new Set(), 10)).toEqual(["b", "d", "e", "g"])
    expect(nextUnsent(rows, new Set(["d"]), 2)).toEqual(["b", "e"])
  })

  it("the daily allowance counts what went out and what's sending, and never goes below zero", () => {
    expect(allowanceLeft(0, 0)).toBe(CAMPAIGN_DAILY_LIMIT)
    expect(allowanceLeft(70, 5)).toBe(CAMPAIGN_DAILY_LIMIT - 75)
    expect(allowanceLeft(200, 0)).toBe(0)
  })

  it("progress is complete only when everyone is sent", () => {
    expect(campaignProgress({ sent: 75 })).toMatchObject({ total: 75, sent: 75, complete: true })
    expect(campaignProgress({ sent: 74, failed: 1 }).complete).toBe(false)
    expect(campaignProgress({}).complete).toBe(false)
  })
})

describe("sending a campaign in batches", () => {
  beforeEach(() => seed(75))

  it("sends to the ticked people only, and ticks them as sent", async () => {
    const result = await send(ids(0, 10))
    expect(result).toMatchObject({ sent: 10, failed: 0, skipped: 0 })
    expect(store.sentTo).toEqual([ids(0, 10).map((id) => `person${id.slice(1)}@example.test`)])
    for (const id of ids(0, 10)) expect(statusOf(id)).toBe("sent")
    expect(store.rows.find((r) => r.id === "r0")!.sentAt).toBeInstanceOf(Date)
    for (const id of ids(10, 75)) expect(statusOf(id)).toBe("pending")
  })

  it("never sends anyone the email twice: a second click on the same people sends nobody", async () => {
    await send(ids(0, 10))
    const again = await send(ids(0, 10))
    expect(again).toMatchObject({ sent: 0, skipped: 10 })
    expect(store.sentTo).toHaveLength(1)
  })

  it("a batch mixing sent and new people only sends to the new ones", async () => {
    await send(ids(0, 10))
    const next = await send(ids(5, 15))
    expect(next).toMatchObject({ sent: 5, skipped: 5 })
    expect(store.sentTo[1]).toEqual(ids(10, 15).map((id) => `person${id.slice(1)}@example.test`))
  })

  it("marks the people Resend refused as failed, with its reason, and the rest as sent", async () => {
    store.failNext = { failedTo: ["person2@example.test"], error: "daily_quota_exceeded" }
    const result = await send(ids(0, 4))
    expect(result).toMatchObject({ sent: 3, failed: 1, error: "daily_quota_exceeded" })
    expect(statusOf("r2")).toBe("failed")
    expect(store.rows.find((r) => r.id === "r2")!.error).toBe("daily_quota_exceeded")
    expect(statusOf("r1")).toBe("sent")
  })

  it("a failed person can be sent again", async () => {
    store.failNext = { failedTo: ["person0@example.test"], error: "Resend was down" }
    await send(["r0"])
    expect(statusOf("r0")).toBe("failed")
    const retry = await send(["r0"])
    expect(retry.sent).toBe(1)
    expect(statusOf("r0")).toBe("sent")
  })

  it(`stops at the day's limit of ${CAMPAIGN_DAILY_LIMIT}, saying how many can still go`, async () => {
    seed(100)
    const already = CAMPAIGN_DAILY_LIMIT - 5
    for (const r of store.rows.slice(0, already)) Object.assign(r, { status: "sent", sentAt: new Date() })
    // 6 ticked but only 5 can go today: nothing is sent.
    await expect(send(ids(already, already + 6))).rejects.toThrow(/You can send 5 more today/)
    expect(store.sentTo).toHaveLength(0)
    expect((await send(ids(already, already + 5))).sent).toBe(5)
    await expect(send([`r${already + 5}`])).rejects.toThrow(CampaignError)
    await expect(send([`r${already + 5}`])).rejects.toThrow(/limit is used up/)
  })

  it("yesterday's sends don't count against today", async () => {
    const longAgo = new Date(Date.now() - 25 * 60 * 60 * 1000)
    for (const r of store.rows.slice(0, 60)) Object.assign(r, { status: "sent", sentAt: longAgo })
    expect((await send(ids(60, 75))).sent).toBe(15)
  })

  it("won't send from an archived campaign", async () => {
    seed(5, "archived")
    await expect(send(["r0"])).rejects.toThrow(/archived/)
    expect(store.sentTo).toHaveLength(0)
  })

  it("someone stuck 'sending' for over 10 minutes shows as failed with a note, so you decide whether to resend", async () => {
    Object.assign(store.rows[0], { status: "sending", updatedAt: new Date(Date.now() - 11 * 60 * 1000) })
    Object.assign(store.rows[1], { status: "sending", updatedAt: new Date() })
    await send(["r5"])
    expect(statusOf("r0")).toBe("failed")
    expect(store.rows[0].error).toMatch(/may or may not have arrived/)
    expect(statusOf("r1")).toBe("sending")
  })
})

describe("campaigns written with AI", () => {
  const R2 = "https://art.example.test"
  const art = (n: string) => `${R2}/email-art/2026-10/${n}`
  const design = (heroUrl: string | undefined) => ({
    version: 1,
    subject: "Three quick wins with Engage",
    preview: "Start with one comment, written in your voice.",
    hero: { lead: "Your first comment", accent: "takes a minute.", scene: "two paper cups and a string", paintingUrl: art("p.jpg"), imageUrl: heroUrl },
    blocks: [
      { type: "text", text: "Hi {{firstName}}," },
      { type: "button", label: "Open LinkedIn", href: "https://www.linkedin.com/feed/" },
    ],
  })

  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_R2_PUBLIC_URL", R2)
    seed(20)
  })
  afterEach(() => vi.unstubAllEnvs())

  it("sends the designed email, not the plain broadcast", async () => {
    store.campaigns[0].design = design(art("h.jpg"))
    const result = await send(ids(0, 3))
    expect(result.sent).toBe(3)
    expect(store.designedTo).toEqual([["person0@example.test", "person1@example.test", "person2@example.test"]])
    expect(store.sentTo).toEqual([])
  })

  it("refuses a design whose picture isn't painted, before anyone is marked sending", async () => {
    store.campaigns[0].design = design(undefined)
    await expect(send(ids(0, 3))).rejects.toThrow(/Paint the picture/)
    expect(store.rows.slice(0, 3).map((r) => r.status)).toEqual(["pending", "pending", "pending"])
  })

  it("refuses a design pointing at a picture that isn't ours", async () => {
    store.campaigns[0].design = design("https://elsewhere.example.com/x.jpg")
    await expect(send(["r0"])).rejects.toThrow(/isn't one of ours/)
    expect(store.designedTo).toEqual([])
  })
})
