// Leads (Admin → Broadcasts → Leads): reading a CSV and matching its columns
// (lib/leadRules.ts); saving uploads, lead audiences and deleting a list
// (lib/leads.ts); campaigns to leads with their own merge fields, the
// Unsubscribe link and headers, and nobody unsubscribed or already a user
// emailed (lib/campaigns.ts); the Unsubscribe route; the upload route; what
// the AI writer is told about leads; and sending leads' emails through Brevo
// (lib/brevo.ts) with its own daily limit and webhook; and All leads: the
// filters (lib/leadFilters.ts), lists made by hand and filled by ticking,
// smart lists, many leads at once, one lead, and their routes; and
// ready-made emails sent as campaigns (lib/readyEmails.ts). Against an
// in-memory database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

type LeadRow = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  fields: Record<string, string>
  unsubscribedAt: Date | null
  stopReason?: string | null
  lastEmailedAt: Date | null
  emailCount: number
  createdAt: Date
}
type ListRow = { id: string; name: string; fileName: string | null; columns: unknown; createdBy: string; createdAt: Date; kind?: string; filter?: unknown }
type RecipientRow = {
  id: string
  campaignId: string
  userId: string | null
  email: string
  name: string | null
  status: string
  sentAt: Date | null
  error: string | null
  batchId: string | null
  provider?: string | null
  openedAt?: Date | null
  openCount?: number
  clickedAt?: Date | null
  clickCount?: number
  createdAt: Date
  updatedAt: Date
}

const store = vi.hoisted(() => ({
  admin: { email: "admin@carouselabs.com" } as { email: string } | null,
  users: [] as { id: string; email: string; deletedAt?: Date | null }[],
  leads: [] as LeadRow[],
  lists: [] as ListRow[],
  members: [] as { listId: string; leadId: string }[],
  campaigns: [] as {
    id: string
    subject: string
    body: string
    status: string
    design: unknown
    audience?: string
    audienceValue?: string | null
    sendVia?: string | null
    sendFrom?: string | null
    replyTo?: string | null
  }[],
  recipients: [] as RecipientRow[],
  audit: [] as { action: string; details: string }[],
  // As before scripts/leads.sql's Brevo part is run: no Lead.stopReason or EmailCampaignRecipient.provider.
  columnsMissing: false,
  // As before scripts/lead-lists.sql is run: no LeadList.kind or filter.
  listsSqlMissing: false,
  nextId: 1,
}))

function missingColumn() {
  return new Prisma.PrismaClientKnownRequestError("The column does not exist in the current database.", { code: "P2022", clientVersion: "5.22.0" })
}

// Enough of Prisma's `where` for the queries lib/leads.ts and lib/campaigns.ts make.
function matches(row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "lists") {
      const listIds = store.members.filter((m) => m.leadId === row.id).map((m) => m.listId)
      const c = cond as { some?: { listId: string }; every?: { listId: string } }
      if (c.some && !listIds.includes(c.some.listId)) return false
      if (c.every && !listIds.every((id) => id === c.every!.listId)) return false
      return true
    }
    if (key === "OR") return (cond as Record<string, unknown>[]).some((w) => matches(row, w))
    if (key === "AND") return (cond as Record<string, unknown>[]).every((w) => matches(row, w))
    const value = row[key]
    if (cond === null) return value === null || value === undefined
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { in?: unknown[]; not?: unknown; lt?: Date; gte?: Date; mode?: string; contains?: string }
      const fold = (v: unknown) => (c.mode === "insensitive" ? String(v).toLowerCase() : v)
      if (c.in && !c.in.map(fold).includes(fold(value))) return false
      if ("not" in c && c.not === null && (value === null || value === undefined)) return false
      if (c.lt && !(value instanceof Date && value < c.lt)) return false
      if (c.gte && !(value instanceof Date && value >= c.gte)) return false
      if (c.contains && !String(value ?? "").toLowerCase().includes(c.contains.toLowerCase())) return false
      return true
    }
    return value === cond
  })
}

const pick = <T extends Record<string, unknown>>(row: T, select?: Record<string, unknown>) =>
  select ? (Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) as T) : { ...row }

// Prisma's orderBy ([{ createdAt: "desc" }, { email: "asc" }]), skip and take.
type Order = Record<string, "asc" | "desc">
function ordered<T>(rows: T[], args: { orderBy?: Order | Order[]; skip?: number; take?: number }): T[] {
  const orders = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : []
  const value = (row: T, k: string) => {
    const v = (row as Record<string, unknown>)[k]
    return v instanceof Date ? v.getTime() : (v as string | number)
  }
  const sorted = [...rows].sort((a, b) => {
    for (const o of orders) {
      const [k, dir] = Object.entries(o)[0]
      const x = value(a, k)
      const y = value(b, k)
      if (x !== y) return (x < y ? -1 : 1) * (dir === "desc" ? -1 : 1)
    }
    return 0
  })
  return sorted.slice(args.skip ?? 0, args.take === undefined ? undefined : (args.skip ?? 0) + args.take)
}
const listOf = (id: string) => ({ id, name: store.lists.find((x) => x.id === id)?.name })

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => store.users.filter((u) => matches(u, where))) },
    lead: {
      findMany: vi.fn(
        async ({
          where,
          select,
          include,
          ...order
        }: { where?: Record<string, unknown>; select?: Record<string, unknown>; include?: { lists?: unknown }; orderBy?: Order | Order[]; skip?: number; take?: number } = {}) =>
          ordered(
            store.leads.filter((l) => matches(l, where)),
            order,
          ).map((l) => ({
            ...pick(l, select),
            ...(include?.lists || select?.lists
              ? { lists: store.members.filter((m) => m.leadId === l.id).map((m) => ({ list: { id: m.listId, name: store.lists.find((x) => x.id === m.listId)?.name } })) }
              : {}),
          })),
      ),
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, unknown> }) => {
        const lead = store.leads.find((l) => l.id === where.id)
        return lead ? pick(lead, select) : null
      }),
      createMany: vi.fn(async ({ data, skipDuplicates }: { data: Partial<LeadRow>[]; skipDuplicates?: boolean }) => {
        let count = 0
        for (const d of data) {
          if (store.leads.some((l) => l.email === d.email)) {
            if (!skipDuplicates) throw new Error("Unique constraint failed on email")
            continue
          }
          store.leads.push({
            id: `lead${store.nextId++}`,
            firstName: null,
            lastName: null,
            name: null,
            fields: {},
            unsubscribedAt: null,
            lastEmailedAt: null,
            emailCount: 0,
            createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, store.nextId)),
            ...d,
          } as LeadRow)
          count++
        }
        return { count }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<LeadRow> }) => Object.assign(store.leads.find((l) => l.id === where.id)!, data)),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<LeadRow> & { emailCount?: { increment: number } } }) => {
        if (store.columnsMissing && "stopReason" in data) throw missingColumn()
        const hit = store.leads.filter((l) => matches(l, where))
        const { emailCount, ...rest } = data
        for (const l of hit) {
          Object.assign(l, rest)
          if (emailCount) l.emailCount += emailCount.increment
        }
        return { count: hit.length }
      }),
      count: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => store.leads.filter((l) => matches(l, where)).length),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const gone = new Set(store.leads.filter((l) => matches(l, where)).map((l) => l.id))
        store.leads = store.leads.filter((l) => !gone.has(l.id))
        store.members = store.members.filter((m) => !gone.has(m.leadId))
        return { count: gone.size }
      }),
    },
    leadList: {
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, unknown> }) => {
        const list = store.lists.find((l) => l.id === where.id)
        return list ? pick(list, select) : null
      }),
      findMany: vi.fn(async ({ where, select }: { where?: Record<string, unknown>; select?: Record<string, unknown> } = {}) => {
        if (store.listsSqlMissing && select && "kind" in select) throw missingColumn()
        return ordered(
          store.lists.filter((l) => matches(l, where)),
          { orderBy: { createdAt: "desc" } },
        ).map((l) => ({
          ...l,
          kind: store.listsSqlMissing ? undefined : (l.kind ?? "static"),
          filter: store.listsSqlMissing ? undefined : (l.filter ?? null),
          _count: { members: store.members.filter((m) => m.listId === l.id).length },
        }))
      }),
      create: vi.fn(async ({ data }: { data: Omit<ListRow, "id" | "createdAt"> }) => {
        if (store.listsSqlMissing && "kind" in data) throw missingColumn()
        const list = { id: `list${store.nextId++}`, createdAt: new Date(Date.UTC(2026, 9, 2, 0, 0, store.nextId)), ...data } as ListRow
        store.lists.push(list)
        return { id: list.id }
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<ListRow> }) => Object.assign(store.lists.find((l) => l.id === where.id)!, data)),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        store.lists = store.lists.filter((l) => l.id !== where.id)
        store.members = store.members.filter((m) => m.listId !== where.id)
      }),
    },
    leadListMember: {
      createMany: vi.fn(async ({ data }: { data: { listId: string; leadId: string }[] }) => {
        let count = 0
        for (const d of data) {
          if (store.members.some((m) => m.listId === d.listId && m.leadId === d.leadId)) continue
          store.members.push(d)
          count++
        }
        return { count }
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        store.members.filter((m) => matches(m, where)).map((m) => ({ leadId: m.leadId, list: listOf(m.listId) })),
      ),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const before = store.members.length
        store.members = store.members.filter((m) => !matches(m, where))
        return { count: before - store.members.length }
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    emailCampaign: {
      findUnique: vi.fn(async ({ where, select }: { where: { id: string }; select?: Record<string, unknown> }) => {
        if (store.columnsMissing && select && "sendVia" in select) throw missingColumn()
        const campaign = store.campaigns.find((c) => c.id === where.id)
        if (!campaign) return null
        return select?.recipients ? { ...campaign, recipients: store.recipients.filter((r) => r.campaignId === campaign.id) } : campaign
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { subject: string; body: string; audience: string; audienceValue: string | null; design?: unknown; sendVia?: string | null; sendFrom?: string | null; replyTo?: string | null; recipients: { createMany: { data: Partial<RecipientRow>[] } } }
        }) => {
          if (store.columnsMissing && "sendVia" in data) throw missingColumn()
          const id = `camp${store.nextId++}`
          const { recipients, ...fields } = data
          store.campaigns.push({ id, status: "active", ...fields, design: data.design ?? null })
          for (const r of recipients.createMany.data) store.recipients.push(recipient({ ...r, campaignId: id }))
          return { id }
        },
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        if (store.columnsMissing && "sendVia" in data) throw missingColumn()
        return Object.assign(store.campaigns.find((c) => c.id === where.id)!, data)
      }),
    },
    emailCampaignRecipient: {
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<RecipientRow> }) => {
        const hit = store.recipients.filter((r) => matches(r, where))
        for (const r of hit) Object.assign(r, data, { updatedAt: new Date() })
        return { count: hit.length }
      }),
      findMany: vi.fn(async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) =>
        store.recipients
          .filter((r) => matches(r, where))
          .map((r) => (select?.campaign ? { ...r, campaign: { id: r.campaignId, subject: store.campaigns.find((c) => c.id === r.campaignId)?.subject } } : r)),
      ),
      groupBy: vi.fn(async ({ where, by }: { where: Record<string, unknown>; by?: string[] }) => {
        if (by?.includes("email")) {
          // What each address did: how many sent, and the latest of each time.
          const groups = new Map<string, RecipientRow[]>()
          for (const r of store.recipients.filter((x) => matches(x, where))) groups.set(r.email, [...(groups.get(r.email) ?? []), r])
          const latest = (rows: RecipientRow[], k: "sentAt" | "openedAt" | "clickedAt") =>
            rows
              .map((r) => r[k])
              .filter((d): d is Date => d instanceof Date)
              .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
          return [...groups].map(([email, rows]) => ({
            email,
            _count: { _all: rows.length },
            _max: { sentAt: latest(rows, "sentAt"), openedAt: latest(rows, "openedAt"), clickedAt: latest(rows, "clickedAt") },
          }))
        }
        const counts = new Map<string, number>()
        for (const r of store.recipients.filter((x) => matches(x, where))) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
        return [...counts].map(([status, n]) => ({ status, _count: { _all: n } }))
      }),
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (store.columnsMissing && "provider" in where) throw missingColumn()
        return store.recipients.filter((r) => matches(r, where)).length
      }),
    },
  },
}))
vi.mock("@/lib/auditLog", () => ({
  logAdminAction: vi.fn(async (entry: { action: string; details: string }) => {
    store.audit.push(entry)
  }),
}))
vi.mock("@/lib/adminAuth", () => ({
  getAdminUser: vi.fn(async () => store.admin),
  adminForbidden: () => Response.json({ error: "Admins only" }, { status: 403 }),
}))
const anthropic = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: anthropic.create }
  },
}))

import {
  LEAD_IMPORT_CHUNK,
  autoMapping,
  buildLeads,
  cleanEmail,
  fieldKey,
  isLeadAudience,
  leadAudienceLabel,
  leadValues,
  mappingProblem,
  mergeFieldProblem,
  parseCsv,
  parseLeadAudience,
  parsePastedLeads,
} from "@/lib/leadRules"
import {
  LeadsError,
  SMART_LISTS_SQL_MISSING,
  bulkLeads,
  createLeadList,
  deleteLeadList,
  importLeads,
  leadDetail,
  leadFieldKeys,
  leadsOverview,
  listLeads,
  resolveLeadAudience,
  stopLeadByEmail,
  unsubscribeLead,
  updateLead,
  updateLeadList,
  writerLeadFields,
} from "@/lib/leads"
import { NO_ENGAGEMENT, describeFilter, isEmptyFilter, matchesInMemory, type Engagement, type LeadFilter } from "@/lib/leadFilters"
import { readUnsubscribeToken, unsubscribeToken, unsubscribeUrl, withUnsubscribe } from "@/lib/leadUnsubscribe"
import { applyVariables } from "@/lib/broadcastRender"
import { personalizeDesignedEmail } from "@/lib/emailDesignRender"
import {
  CampaignError,
  SENDING_SQL_MISSING,
  UNSUBSCRIBED_NOTE,
  campaignAllowance,
  campaignSending,
  checkMergeFields,
  createCampaign,
  getCampaign,
  sendCampaignBatch,
  setCampaignSending,
} from "@/lib/campaigns"
import { senderChoices, resolveSending } from "@/lib/senders"
import { DEFAULT_SENDING } from "@/lib/sendingRules"
import { POST as campaignsPost } from "@/app/api/admin/campaigns/route"
import { CAMPAIGN_DAILY_LIMIT } from "@/lib/campaignRules"
import {
  BREVO_DAILY_LIMIT,
  BREVO_MISSING,
  brevoMailer,
  brevoStatus,
  brevoWebhookToken,
  connectBrevoWebhook,
  idempotencyUuid,
  parseFrom,
} from "@/lib/brevo"
import { sendInBatches } from "@/lib/emailBatchSend"
import { POST as brevoWebhook } from "@/app/api/webhooks/brevo/route"
import { GET as brevoGet } from "@/app/api/admin/brevo/route"
import { readTrackingToken } from "@/lib/emailTracking"
import { audienceLabel } from "@/components/admin/campaignLabels"
import { leadsSection, writerFieldProblem } from "@/lib/ai/emailWriterLeads"
import { writeEmail } from "@/lib/ai/emailWriter"
import { GET as unsubscribeGet, POST as unsubscribePost } from "@/app/api/unsubscribe/[token]/route"
import { GET as leadsGet, POST as leadsPost } from "@/app/api/admin/leads/route"
import { POST as bulkPost } from "@/app/api/admin/leads/bulk/route"
import { POST as listsPost } from "@/app/api/admin/leads/lists/route"
import { DELETE as listDelete, PATCH as listPatch } from "@/app/api/admin/leads/lists/[id]/route"
import { GET as leadGet, PATCH as leadPatch } from "@/app/api/admin/leads/[id]/route"
import { READY_EMAILS, REPLY_LINK, personalizePreview, readyDesignOf, readyEmailHtml, readyEmailText, readySnapshot } from "@/lib/readyEmails"
import { readyFrom, readyHtml } from "@/lib/readyEmailSend"
import { TemplateError, emailContent, parseSource, saveTemplate } from "@/lib/sentEmails"
import type { EmailDesign } from "@/lib/emailDesign"
import type { BatchMailer } from "@/lib/emailBatchSend"

// Users' emails go through Resend, leads' through Brevo: each fake keeps what it was given.
type Sent = { from: string; to: string; subject: string; html: string; headers?: Record<string, string>; replyTo?: string }
const viaResend: Sent[][] = []
const viaBrevo: Sent[][] = []
const fakeMailer = (log: Sent[][]): BatchMailer => ({
  batch: {
    send: vi.fn(async (emails: Sent[]) => {
      log.push(emails)
      return { data: { data: emails.map((_, i) => ({ id: `e${i}` })), errors: [] }, error: null }
    }),
  },
})
const resend = fakeMailer(viaResend)
const brevo = fakeMailer(viaBrevo)

function recipient(r: Partial<RecipientRow>): RecipientRow {
  return {
    id: `r${store.nextId++}`,
    campaignId: "c1",
    userId: null,
    email: "",
    name: null,
    status: "pending",
    sentAt: null,
    error: null,
    batchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...r,
  }
}

const ADMIN = "admin@carouselabs.com"
const lead = (email: string, more: Partial<{ firstName: string; lastName: string; name: string; fields: Record<string, string> }> = {}) => ({
  email,
  firstName: more.firstName ?? null,
  lastName: more.lastName ?? null,
  name: more.name ?? null,
  fields: more.fields ?? {},
})
const leadByEmail = (email: string) => store.leads.find((l) => l.email === email)!

beforeEach(() => {
  vi.stubEnv("CLERK_SECRET_KEY", "test-only-secret")
  store.admin = { email: ADMIN }
  store.users = [{ id: "u1", email: "Taken@Example.test" }]
  store.leads = []
  store.lists = []
  store.members = []
  store.campaigns = []
  store.recipients = []
  store.audit = []
  store.columnsMissing = false
  store.listsSqlMissing = false
  store.nextId = 1
})
afterEach(() => vi.unstubAllEnvs())

describe("reading the file", () => {
  it("reads quoted cells, commas and quotes inside them, CRLF, a BOM and blank rows", () => {
    const csv = '﻿Email,Name,Note\r\nasha@example.test,"Shah, Asha","said ""hi"""\r\n\r\n ravi@example.test , Ravi ,\n'
    expect(parseCsv(csv)).toEqual([
      ["Email", "Name", "Note"],
      ["asha@example.test", "Shah, Asha", 'said "hi"'],
      ["ravi@example.test", "Ravi", ""],
    ])
  })

  it("reads files saved with semicolons or tabs", () => {
    expect(parseCsv("email;company\na@example.test;Acme, Inc")).toEqual([["email", "company"], ["a@example.test", "Acme, Inc"]])
    expect(parseCsv("email\tcompany\na@example.test\tAcme")).toEqual([["email", "company"], ["a@example.test", "Acme"]])
  })

  it("keeps a line break inside quotes in its cell", () => {
    expect(parseCsv('email,address\na@example.test,"1 Main St\nDelhi"')).toEqual([["email", "address"], ["a@example.test", "1 Main St\nDelhi"]])
  })

  it("cleans addresses and refuses what isn't one", () => {
    expect(cleanEmail("  Asha@Example.TEST ")).toBe("asha@example.test")
    expect(cleanEmail("mailto:ravi@example.test")).toBe("ravi@example.test")
    expect(cleanEmail("<ravi@example.test>")).toBe("ravi@example.test")
    for (const bad of ["", "asha", "asha@", "asha@example", "a b@example.test", `${"x".repeat(250)}@example.test`]) expect(cleanEmail(bad)).toBeNull()
  })

  it("turns any column into a merge field key", () => {
    expect(fieldKey("Company")).toBe("company")
    expect(fieldKey("Company name")).toBe("companyName")
    expect(fieldKey("LinkedIn URL")).toBe("linkedinUrl")
    expect(fieldKey("Café / City")).toBe("cafeCity")
    expect(fieldKey("2nd phone")).toBe("field2ndPhone")
    expect(fieldKey("名前")).toBe("field")
  })

  it("guesses the email and name columns; everything else becomes a merge field", () => {
    expect(autoMapping(["E-mail Address", "First Name", "Surname", "Company", "Personal email", "Name"])).toEqual([
      { label: "E-mail Address", role: "email", key: "eMailAddress" },
      { label: "First Name", role: "firstName", key: "firstName2" },
      { label: "Surname", role: "lastName", key: "surname" },
      { label: "Company", role: "field", key: "company" },
      { label: "Personal email", role: "skip", key: "personalEmail" },
      { label: "Name", role: "name", key: "name2" },
    ])
    // A second name column is kept as a field rather than lost.
    expect(autoMapping(["email", "name", "full name"]).map((m) => m.role)).toEqual(["email", "name", "field"])
  })

  it("says what's wrong with the choices", () => {
    const base = autoMapping(["email", "company", "city"])
    expect(mappingProblem(base)).toBeNull()
    expect(mappingProblem(base.map((m) => ({ ...m, role: m.role === "email" ? ("skip" as const) : m.role })))).toMatch(/column with the email/)
    expect(mappingProblem(base.map((m) => ({ ...m, key: "company" })))).toMatch(/Two columns are both \{\{company\}\}/)
    expect(mappingProblem(base.map((m) => (m.label === "city" ? { ...m, key: "City" } : m)))).toMatch(/must start with a small letter/)
    expect(mappingProblem(base.map((m) => (m.label === "city" ? { ...m, key: "email" } : m)))).toMatch(/already every lead's email/)
  })

  it("makes one lead per address, counting rows without one and repeats", () => {
    const rows = parseCsv("Email,First,Company\nAsha@Example.test,Asha,Acme\nnot-an-email,X,Y\nasha@example.test,Asha again,Other\n,No one,Z\nravi@example.test,,")
    const [headers, ...body] = rows
    const built = buildLeads(body, autoMapping(headers))
    expect(built.invalid).toBe(2)
    expect(built.duplicates).toBe(1)
    expect(built.leads).toEqual([
      { email: "asha@example.test", firstName: "Asha", lastName: null, name: null, fields: { company: "Acme" } },
      { email: "ravi@example.test", firstName: null, lastName: null, name: null, fields: {} },
    ])
  })

  it("fills a lead's merge fields: first name from the name, or 'there'", () => {
    expect(leadValues({ email: "a@x.test", firstName: "Asha", lastName: "Shah", name: null, fields: { company: "Acme" } })).toEqual({
      company: "Acme",
      email: "a@x.test",
      firstName: "Asha",
      lastName: "Shah",
      name: "Asha Shah",
    })
    expect(leadValues({ email: "r@x.test", firstName: null, lastName: null, name: "Ravi Kumar", fields: {} }).firstName).toBe("Ravi")
    expect(leadValues({ email: "n@x.test", firstName: null, lastName: null, name: null, fields: {} })).toMatchObject({ firstName: "there", name: "there" })
    // Something in the stored fields that isn't a merge field is ignored.
    expect(leadValues({ email: "n@x.test", firstName: null, lastName: null, name: null, fields: { "bad key": "x", ok: 3 } })).not.toHaveProperty("bad key")
  })
})

describe("lead audiences and merge fields", () => {
  it("knows the three audiences and nothing else", () => {
    expect(parseLeadAudience("leads:all")).toEqual({ kind: "all" })
    expect(parseLeadAudience("leads:new")).toEqual({ kind: "new" })
    expect(parseLeadAudience("leads:list:abc_123")).toEqual({ kind: "list", listId: "abc_123" })
    for (const bad of ["leads", "leads:", "leads:list:", "leads:list:a b", "all", "leads:everyone"]) expect(isLeadAudience(bad)).toBe(false)
    expect(leadAudienceLabel("leads:list:abc", "Delhi founders")).toBe("Leads: Delhi founders")
    expect(audienceLabel("leads:new", null)).toBe("Leads never emailed")
    expect(audienceLabel("engage_linkedin", null)).toBe("CarouseLabs Engage for LinkedIn users")
  })

  it("users have the account fields, leads their name, email and columns", () => {
    expect(mergeFieldProblem("Hi {{firstName}}, {{plan}}", false)).toBeNull()
    expect(mergeFieldProblem("Hi {{firstName}} at {{company}}", false)).toMatch(/\{\{company\}\}, which only leads have/)
    expect(mergeFieldProblem("Hi {{firstName}} at {{company}}", true, ["company"])).toBeNull()
    expect(mergeFieldProblem("Hi {{name}}, {{email}}", true)).toBeNull()
    expect(mergeFieldProblem("You're on {{plan}}", true, ["company"])).toMatch(/\{\{plan\}\}, which your leads don't have/)
  })

  it("a lead's missing field becomes nothing; a user's stays visible", () => {
    expect(applyVariables("Hi {{firstName}} at {{company}}", { firstName: "Asha" }, { blankMissing: true })).toBe("Hi Asha at ")
    expect(applyVariables("Hi {{firstName}} at {{company}}", { firstName: "Asha" })).toBe("Hi Asha at {{company}}")
    const copy = personalizeDesignedEmail("<p>Hi {{firstName}} at {{company}}, {{city}}</p>", "For {{company}}", { firstName: "Asha", company: "A&B" }, { blankMissing: true })
    expect(copy).toEqual({ subject: "For A&B", html: "<p>Hi Asha at A&amp;B, </p>" })
  })
})

describe("saving an upload", () => {
  it("saves new leads once, skipping CarouseLabs users and bad addresses, and puts them on the list", async () => {
    const result = await importLeads({
      adminEmail: ADMIN,
      listName: "Delhi founders",
      fileName: "delhi.csv",
      columns: [{ key: "company", label: "Company" }],
      leads: [
        lead("Asha@Example.test", { firstName: "Asha", fields: { company: "Acme" } }),
        lead("asha@example.test", { firstName: "Twice" }),
        lead("taken@example.test", { firstName: "Already a user" }),
        lead("not-an-email"),
        lead("ravi@example.test", { name: "Ravi Kumar" }),
      ],
    })
    expect(result).toMatchObject({ added: 2, alreadySaved: 0, alreadyUsers: 1, unsubscribed: 0, invalid: 1 })
    expect(store.leads.map((l) => l.email)).toEqual(["asha@example.test", "ravi@example.test"])
    expect(leadByEmail("asha@example.test")).toMatchObject({ firstName: "Asha", fields: { company: "Acme" } })
    expect(store.lists).toEqual([expect.objectContaining({ id: result.listId, name: "Delhi founders", fileName: "delhi.csv", columns: [{ key: "company", label: "Company" }], createdBy: ADMIN })])
    expect(store.members.filter((m) => m.listId === result.listId)).toHaveLength(2)
    expect(store.audit.at(-1)).toMatchObject({ action: "IMPORT_LEADS" })
  })

  it("a lead in a later file keeps one row: new columns added, a missing name filled, nothing blanked", async () => {
    const first = await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [{ key: "company", label: "Company" }], leads: [lead("asha@example.test", { firstName: "Asha", fields: { company: "Acme" } })] })
    const second = await importLeads({
      adminEmail: ADMIN,
      listName: "Day 2",
      columns: [{ key: "city", label: "City" }],
      leads: [lead("asha@example.test", { lastName: "Shah", fields: { city: "Delhi" } }), lead("new@example.test")],
    })
    expect(second).toMatchObject({ added: 1, alreadySaved: 1 })
    expect(store.leads.filter((l) => l.email === "asha@example.test")).toHaveLength(1)
    expect(leadByEmail("asha@example.test")).toMatchObject({ firstName: "Asha", lastName: "Shah", fields: { company: "Acme", city: "Delhi" } })
    // On both lists.
    expect(store.members.filter((m) => m.leadId === leadByEmail("asha@example.test").id).map((m) => m.listId)).toEqual([first.listId, second.listId])
  })

  it("the parts of one upload go to the same list, which learns every column", async () => {
    const first = await importLeads({ adminEmail: ADMIN, listName: "Big file", columns: [{ key: "company", label: "Company" }], leads: [lead("a@example.test")] })
    const next = await importLeads({ adminEmail: ADMIN, listId: first.listId, listName: "Big file", columns: [{ key: "company", label: "Company" }, { key: "city", label: "City" }], leads: [lead("b@example.test")] })
    expect(next.listId).toBe(first.listId)
    expect(store.lists).toHaveLength(1)
    expect(store.lists[0].columns).toEqual([{ key: "company", label: "Company" }, { key: "city", label: "City" }])
    expect(store.members).toHaveLength(2)
    await expect(importLeads({ adminEmail: ADMIN, listId: "gone", listName: "x", columns: [], leads: [lead("c@example.test")] })).rejects.toBeInstanceOf(LeadsError)
  })

  it("someone who unsubscribed stays unsubscribed when a new file has them", async () => {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: [lead("asha@example.test")] })
    await unsubscribeLead(leadByEmail("asha@example.test").id)
    const again = await importLeads({ adminEmail: ADMIN, listName: "Day 2", columns: [], leads: [lead("asha@example.test", { firstName: "Asha" })] })
    expect(again.unsubscribed).toBe(1)
    expect(leadByEmail("asha@example.test").unsubscribedAt).toBeInstanceOf(Date)
  })

  it("the page's numbers, lists and people", async () => {
    const { listId } = await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [{ key: "company", label: "Company" }], leads: [lead("a@example.test", { name: "Asha" }), lead("b@example.test")] })
    leadByEmail("b@example.test").unsubscribedAt = new Date()
    const overview = await leadsOverview()
    expect(overview.totals).toEqual({ total: 2, unsubscribed: 1, neverEmailed: 1 })
    expect(overview.lists).toEqual([expect.objectContaining({ id: listId, name: "Day 1", count: 2, columns: [{ key: "company", label: "Company" }] })])
    const page = await listLeads({ filter: { q: "asha" } })
    expect(page.leads).toEqual([expect.objectContaining({ email: "a@example.test", name: "Asha", lists: [{ id: listId, name: "Day 1" }] })])
    expect((await listLeads({ filter: { listId } })).total).toBe(2)
  })
})

describe("who a lead audience is", () => {
  async function seedLeads() {
    const a = await importLeads({ adminEmail: ADMIN, listName: "A", columns: [], leads: [lead("one@example.test", { name: "One" }), lead("two@example.test"), lead("three@example.test")] })
    const b = await importLeads({ adminEmail: ADMIN, listName: "B", columns: [], leads: [lead("four@example.test"), lead("three@example.test")] })
    return { a: a.listId, b: b.listId }
  }

  it("leaves out anyone unsubscribed, and anyone who has since signed up", async () => {
    await seedLeads()
    leadByEmail("two@example.test").unsubscribedAt = new Date()
    store.users.push({ id: "u2", email: "FOUR@example.test" })
    const people = await resolveLeadAudience("leads:all")
    expect(people.map((p) => p.email)).toEqual(["one@example.test", "three@example.test"])
    expect(people[0]).toEqual({ userId: null, email: "one@example.test", name: "One" })
  })

  it("'never emailed' leaves out leads a campaign has reached; a list is only its own people", async () => {
    const { a, b } = await seedLeads()
    leadByEmail("one@example.test").lastEmailedAt = new Date()
    expect((await resolveLeadAudience("leads:new")).map((p) => p.email)).toEqual(["two@example.test", "three@example.test", "four@example.test"])
    expect((await resolveLeadAudience(`leads:list:${b}`)).map((p) => p.email)).toEqual(["three@example.test", "four@example.test"])
    expect((await resolveLeadAudience(`leads:list:${a}`)).map((p) => p.email)).toEqual(["one@example.test", "two@example.test", "three@example.test"])
    await expect(resolveLeadAudience("leads:list:gone")).rejects.toBeInstanceOf(LeadsError)
  })

  it("deleting a list removes the leads only on it, keeping those on another list and anyone unsubscribed", async () => {
    const { a } = await seedLeads()
    leadByEmail("two@example.test").unsubscribedAt = new Date()
    expect(await deleteLeadList(a, ADMIN)).toEqual({ removed: 1 })
    expect(store.leads.map((l) => l.email).sort()).toEqual(["four@example.test", "three@example.test", "two@example.test"])
    expect(store.lists.map((l) => l.name)).toEqual(["B"])
  })
})

describe("campaigns to leads", () => {
  beforeEach(() => {
    viaResend.length = 0
    viaBrevo.length = 0
  })

  it("a list's campaign keeps the list's name and its people's names, leaving out the unsubscribed", async () => {
    const { listId } = await importLeads({
      adminEmail: ADMIN,
      listName: "Delhi founders",
      columns: [{ key: "company", label: "Company" }],
      leads: [lead("asha@example.test", { firstName: "Asha", lastName: "Shah" }), lead("ravi@example.test"), lead("gone@example.test")],
    })
    leadByEmail("gone@example.test").unsubscribedAt = new Date()
    const made = await createCampaign({ adminEmail: ADMIN, subject: "Hi {{firstName}}", body: "At {{company}}?", recipients: `leads:list:${listId}`, audienceValue: null })
    expect(made.total).toBe(2)
    expect(store.campaigns[0]).toMatchObject({ audience: `leads:list:${listId}`, audienceValue: "Delhi founders" })
    expect(store.recipients.map((r) => [r.email, r.name, r.userId])).toEqual([
      ["asha@example.test", "Asha Shah", null],
      ["ravi@example.test", null, null],
    ])
  })

  it("refuses merge fields the people don't have", async () => {
    await importLeads({ adminEmail: ADMIN, listName: "No columns", columns: [], leads: [lead("asha@example.test")] })
    await expect(checkMergeFields("Hi {{firstName}} at {{company}}", "all")).rejects.toThrow(/only leads have/)
    await expect(checkMergeFields("Your {{plan}} plan", "leads:all")).rejects.toThrow(/your leads don't have/)
    await expect(checkMergeFields("Hi {{firstName}} at {{company}}", "leads:all")).rejects.toBeInstanceOf(CampaignError)
    await importLeads({ adminEmail: ADMIN, listName: "With company", columns: [{ key: "company", label: "Company" }], leads: [lead("ravi@example.test")] })
    await expect(checkMergeFields("Hi {{firstName}} at {{company}}", "leads:all")).resolves.toBeUndefined()
    // A list's own columns only.
    await expect(checkMergeFields("Hi {{firstName}} at {{company}}", `leads:list:${store.lists[0].id}`)).rejects.toBeInstanceOf(CampaignError)
    await expect(createCampaign({ adminEmail: ADMIN, subject: "Hi", body: "{{company}}", recipients: "all", audienceValue: null })).rejects.toThrow(/only leads have/)
  })

  it("each lead gets their own fields, a tracked copy and an Unsubscribe link and header; an unsubscribed lead gets nothing", async () => {
    await importLeads({
      adminEmail: ADMIN,
      listName: "Day 1",
      columns: [{ key: "company", label: "Company" }],
      leads: [lead("asha@example.test", { firstName: "Asha", fields: { company: "Acme" } }), lead("ravi@example.test", { name: "Ravi Kumar" }), lead("gone@example.test")],
    })
    store.campaigns = [{ id: "c1", subject: "For {{firstName}} at {{company}}", body: "Hi {{firstName}}, a note for {{company}}.", status: "active", design: null }]
    store.recipients = ["asha@example.test", "ravi@example.test", "gone@example.test"].map((email, i) => recipient({ id: `r${i}`, email }))
    leadByEmail("gone@example.test").unsubscribedAt = new Date()

    const result = await sendCampaignBatch({ campaignId: "c1", recipientIds: ["r0", "r1", "r2"], adminEmail: ADMIN, resend, brevo, from: "CarouseLabs <hello@carouselabs.com>" })

    expect(result).toMatchObject({ sent: 2, failed: 1, error: "1 unsubscribed, so not sent" })
    expect(viaResend).toEqual([])
    const emails = viaBrevo.flat()
    expect(emails.map((e) => [e.to, e.subject])).toEqual([
      ["asha@example.test", "For Asha at Acme"],
      ["ravi@example.test", "For Ravi at "],
    ])
    const asha = emails[0]
    expect(asha.html).toContain("Hi Asha, a note for Acme.")
    expect(emails[1].html).not.toContain("{{")
    // Unsubscribe: in the footer and as headers, naming this lead, and not passed through click tracking.
    const link = /href="([^"]+\/api\/unsubscribe\/[^"]+)"/.exec(asha.html)?.[1]
    expect(link).toBe(unsubscribeUrl(unsubscribeToken(leadByEmail("asha@example.test").id)!))
    expect(readUnsubscribeToken(link!.split("/").pop()!)).toBe(leadByEmail("asha@example.test").id)
    expect(asha.headers).toEqual({ "List-Unsubscribe": `<${link}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" })
    expect(asha.html).not.toMatch(/email-track\/click\/[^"]*unsubscribe/)
    // Seen tracking still works for leads.
    const pixel = /email-track\/open\/([^"]+)"/.exec(asha.html)?.[1]
    expect(readTrackingToken(pixel!)).toEqual({ kind: "campaign", id: "r0" })

    expect(store.recipients.map((r) => [r.email, r.status, r.error])).toEqual([
      ["asha@example.test", "sent", null],
      ["ravi@example.test", "sent", null],
      ["gone@example.test", "failed", UNSUBSCRIBED_NOTE],
    ])
    expect(leadByEmail("asha@example.test")).toMatchObject({ emailCount: 1, lastEmailedAt: expect.any(Date) })
    expect(leadByEmail("gone@example.test")).toMatchObject({ emailCount: 0, lastEmailedAt: null })

    // Sending to the unsubscribed lead again still doesn't email them.
    viaBrevo.length = 0
    await sendCampaignBatch({ campaignId: "c1", recipientIds: ["r2"], adminEmail: ADMIN, resend, brevo, from: "x" })
    expect(viaBrevo.flat()).toEqual([])
  })

  it("a lead's email isn't sent without its Unsubscribe link; a user's copy has none", async () => {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: [lead("asha@example.test")] })
    store.campaigns = [{ id: "c1", subject: "Hello", body: "Hello there.", status: "active", design: null }]
    store.recipients = [recipient({ id: "r0", email: "asha@example.test" }), recipient({ id: "r1", email: "someone@example.test" })]
    vi.stubEnv("CLERK_SECRET_KEY", "")
    const result = await sendCampaignBatch({ campaignId: "c1", recipientIds: ["r0", "r1"], adminEmail: ADMIN, resend, brevo, from: "x" })
    expect(result.sent).toBe(1)
    expect(viaBrevo).toEqual([])
    expect(viaResend.flat().map((e) => e.to)).toEqual(["someone@example.test"])
    expect(viaResend.flat()[0].headers).toBeUndefined()
    expect(viaResend.flat()[0].html).not.toContain("Unsubscribe")
    expect(store.recipients[0]).toMatchObject({ status: "failed", error: expect.stringMatching(/Unsubscribe link couldn't be made/) })
  })
})

describe("the Unsubscribe link", () => {
  it("is signed: a changed or made-up token is refused", () => {
    const token = unsubscribeToken("lead123")!
    expect(readUnsubscribeToken(token)).toBe("lead123")
    expect(readUnsubscribeToken(token.replace("lead123", "lead124"))).toBeNull()
    expect(readUnsubscribeToken("lead123.AAAAAAAAAAAAAAAAAAAAAA")).toBeNull()
    expect(readUnsubscribeToken("nonsense")).toBeNull()
  })

  it("sits under the footer, inside the email's background", () => {
    expect(withUnsubscribe("<html><body><p>Hi</p></body></html>", "https://carouselabs.com/api/unsubscribe/t")).toMatch(
      /<p>Hi<\/p><div[^>]*>.*href="https:\/\/carouselabs.com\/api\/unsubscribe\/t".*Unsubscribe<\/a>.*<\/div><\/body><\/html>$/,
    )
    // One written by hand: inside its wrapper, even with the tracking image after it.
    expect(withUnsubscribe('<div class="page"><p>Hi</p></div><img src="pixel">', "https://carouselabs.com/api/unsubscribe/t")).toMatch(
      /^<div class="page"><p>Hi<\/p><div[^>]*>.*Unsubscribe<\/a>.*<\/p><\/div><\/div><img src="pixel">$/,
    )
  })

  async function seedOne() {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: [lead("asha@example.test")] })
    const id = leadByEmail("asha@example.test").id
    return { id, token: unsubscribeToken(id)! }
  }
  const call = (handler: typeof unsubscribeGet, token: string, init?: RequestInit) =>
    handler(new Request(`https://carouselabs.com/api/unsubscribe/${token}`, init), { params: Promise.resolve({ token }) })

  it("opening it only asks: a mail scanner can't unsubscribe anyone", async () => {
    const { id, token } = await seedOne()
    const res = await call(unsubscribeGet, token)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain("Unsubscribe?")
    expect(html).toContain('<form method="post">')
    expect(leadByEmail("asha@example.test").unsubscribedAt).toBeNull()
    expect(id).toBeTruthy()
  })

  it("the page's button unsubscribes them and says so", async () => {
    const { token } = await seedOne()
    const res = await call(unsubscribePost, token, { method: "POST", body: new URLSearchParams({ confirm: "1" }) })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("You're unsubscribed")
    expect(leadByEmail("asha@example.test").unsubscribedAt).toBeInstanceOf(Date)
  })

  it("the inbox's own one-click button unsubscribes them too", async () => {
    const { token } = await seedOne()
    const res = await call(unsubscribePost, token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    })
    expect(res.status).toBe(200)
    expect(leadByEmail("asha@example.test").unsubscribedAt).toBeInstanceOf(Date)
  })

  it("a token that isn't ours changes nothing", async () => {
    await seedOne()
    expect((await call(unsubscribeGet, "lead1.AAAAAAAAAAAAAAAAAAAAAA")).status).toBe(404)
    expect((await call(unsubscribePost, "lead1.AAAAAAAAAAAAAAAAAAAAAA", { method: "POST", body: new URLSearchParams({ confirm: "1" }) })).status).toBe(404)
    expect(leadByEmail("asha@example.test").unsubscribedAt).toBeNull()
  })

  it("is public (no sign-in), like the tracking links", async () => {
    const proxy = (await import("node:fs")).readFileSync("proxy.ts", "utf8")
    expect(proxy).toContain('"/api/unsubscribe/(.*)"')
  })
})

describe("the upload route", () => {
  const post = (body: unknown) => leadsPost(new Request("https://admin.carouselabs.com/api/admin/leads", { method: "POST", body: JSON.stringify(body) }))
  const part = (n: number) => Array.from({ length: n }, (_, i) => lead(`p${i}@example.test`))

  it("is for admins only", async () => {
    store.admin = null
    expect((await post({ listName: "x", columns: [], leads: part(1) })).status).toBe(403)
    expect(store.leads).toEqual([])
  })

  it("takes one part at a time, with merge-field keys that are real ones", async () => {
    expect((await post({ listName: "Big", columns: [], leads: part(LEAD_IMPORT_CHUNK + 1) })).status).toBe(400)
    expect((await post({ listName: "Bad key", columns: [{ key: "Company Name", label: "Company Name" }], leads: part(1) })).status).toBe(400)
    expect((await post({ listName: "", columns: [], leads: part(1) })).status).toBe(400)
    const ok = await post({ listName: "Fine", columns: [{ key: "company", label: "Company" }], leads: part(LEAD_IMPORT_CHUNK) })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ added: LEAD_IMPORT_CHUNK })
  })
})

describe("what the writer is told", () => {
  const design = (text: string): EmailDesign => ({
    version: 1,
    subject: "A note",
    preview: "Something worth a minute of your time, from the CarouseLabs team.",
    hero: { lead: "A note", accent: "for you.", scene: "a paper airplane on a desk" },
    blocks: [{ type: "text", text }],
  })
  const answer = (body: unknown) => ({ content: [{ type: "text", text: JSON.stringify(body) }], stop_reason: "end_turn" })
  beforeEach(() => anthropic.create.mockReset())

  it("nothing about leads until some are saved; then who they are and their fields", async () => {
    expect(leadsSection(null)).toBe("")
    expect(await writerLeadFields()).toBeNull()
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [{ key: "company", label: "Company" }], leads: [lead("a@example.test")] })
    const fields = await writerLeadFields()
    expect(fields).toEqual([{ key: "company", label: "Company" }])
    const section = leadsSection(fields)
    expect(section).toContain("people who have never used CarouseLabs")
    expect(section).toContain("{{company}} (Company)")
    expect(section).toContain("/sign-up")
  })

  it("a merge field nobody has is sent back to fix", () => {
    expect(writerFieldProblem(design("Hi {{firstName}} at {{company}}"), [{ key: "company", label: "Company" }])).toBeNull()
    expect(writerFieldProblem(design("Hi {{firstName}} at {{company}}"), null)).toMatch(/\{\{company\}\}, which no one has/)
    // {{name}} is a lead's; a user email can't use it.
    expect(writerFieldProblem(design("Hi {{name}}"), null)).toMatch(/\{\{name\}\}/)
    expect(writerFieldProblem(design("Hi {{name}}"), [])).toBeNull()
  })

  it("asks again when the draft invents a field, and tells it about leads in the prompt", async () => {
    anthropic.create
      .mockResolvedValueOnce(answer({ reply: "Draft", design: design("Hi {{firstName}} at {{startup}}") }))
      .mockResolvedValueOnce(answer({ reply: "Fixed", design: design("Hi {{firstName}} at {{company}}") }))
    const result = await writeEmail({ history: [], request: "For my leads", current: null, leads: [{ key: "company", label: "Company" }] })
    expect(result.reply).toBe("Fixed")
    expect(anthropic.create.mock.calls[0][0].system).toContain("LEADS")
    expect(anthropic.create.mock.calls[1][0].messages.at(-1).content).toMatch(/\{\{startup\}\}, which no one has/)
    anthropic.create.mockResolvedValueOnce(answer({ reply: "Draft", design: design("Hi {{firstName}}") }))
    await writeEmail({ history: [], request: "For users", current: null, leads: null })
    expect(anthropic.create.mock.calls[2][0].system).not.toContain("LEADS")
  })
})

// ── Brevo ───────────────────────────────────────────────────────────────

type BrevoCall = { url: string; init: RequestInit; body: Record<string, unknown> }
// A stand-in for Brevo's API: answers each path with the given status and body.
function fakeBrevo(routes: Record<string, { status?: number; body?: unknown } | (() => never)>) {
  const calls: BrevoCall[] = []
  const fetchFn = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const href = String(url)
    calls.push({ url: href, init, body: init.body ? JSON.parse(String(init.body)) : {} })
    const key = Object.keys(routes).find((k) => href.includes(k))
    const route = key ? routes[key] : { status: 404, body: { code: "not_found", message: "no route" } }
    if (typeof route === "function") return route()
    return Response.json(route.body ?? {}, { status: route.status ?? 200 })
  }) as unknown as typeof fetch
  return { calls, fetchFn }
}

describe("sending through Brevo", () => {
  const email = (to: string) => ({ from: "CarouseLabs <support@carouselabs.com>", to, subject: `Hi ${to}`, html: `<p>${to}</p>`, headers: { "List-Unsubscribe": "<x>" } })

  it("is only there with an API key", () => {
    vi.stubEnv("BREVO_API_KEY", "")
    expect(brevoMailer()).toBeNull()
  })

  it("sends each email as one version of one request, from the same sender, with an idempotency key", async () => {
    vi.stubEnv("BREVO_API_KEY", "test-brevo-key")
    const { calls, fetchFn } = fakeBrevo({ "/smtp/email": { status: 201, body: { messageIds: ["a", "b"] } } })
    const answer = await brevoMailer(fetchFn)!.batch.send([email("a@example.test"), email("b@example.test")], { idempotencyKey: "campaign-c1-batch-0" })
    expect(answer).toEqual({ data: { errors: [] }, error: null })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe("https://api.brevo.com/v3/smtp/email")
    expect((calls[0].init.headers as Record<string, string>)["api-key"]).toBe("test-brevo-key")
    expect(calls[0].body).toEqual({
      sender: { name: "CarouseLabs", email: "support@carouselabs.com" },
      subject: "Hi a@example.test",
      htmlContent: "<p>a@example.test</p>",
      messageVersions: [
        { to: [{ email: "a@example.test" }], subject: "Hi a@example.test", htmlContent: "<p>a@example.test</p>" },
        { to: [{ email: "b@example.test" }], subject: "Hi b@example.test", htmlContent: "<p>b@example.test</p>" },
      ],
      // Brevo adds its own List-Unsubscribe and won't take ours.
      headers: { idempotencyKey: idempotencyUuid("campaign-c1-batch-0") },
    })
    expect(idempotencyUuid("campaign-c1-batch-0")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(idempotencyUuid("campaign-c1-batch-0")).not.toBe(idempotencyUuid("campaign-c1-batch-1"))
    expect(parseFrom("support@carouselabs.com")).toEqual({ email: "support@carouselabs.com" })
  })

  it("answers Brevo's refusals the way the batch sender understands", async () => {
    vi.stubEnv("BREVO_API_KEY", "k")
    const send = async (status: number, body: unknown, key?: string) =>
      (await brevoMailer(fakeBrevo({ "/smtp/email": { status, body } }).fetchFn)!.batch.send([email("a@example.test")], key ? { idempotencyKey: key } : {})).error
    expect(await send(402, { code: "not_enough_credits", message: "Not enough credits" })).toEqual({ name: "daily_quota_exceeded", message: "Not enough credits" })
    expect(await send(400, { code: "invalid_parameter", message: "Insufficient credits" })).toMatchObject({ name: "daily_quota_exceeded" })
    expect(await send(429, { message: "Too many requests" })).toMatchObject({ name: "rate_limit_exceeded" })
    expect(await send(503, {})).toEqual({ name: "internal_server_error", message: "error 503" })
    expect(await send(400, { code: "invalid_parameter", message: "sender is not valid" })).toEqual({ name: "invalid_parameter", message: "sender is not valid" })
    // The same batch again within Brevo's 30 minutes: it was already sent.
    expect(await send(400, { code: "duplicate_parameter", message: "duplicate" }, "batch-0")).toBeNull()
    const down = brevoMailer(fakeBrevo({ "/smtp/email": () => { throw new TypeError("fetch failed") } }).fetchFn)!
    expect((await down.batch.send([email("a@example.test")])).error).toEqual({ name: "application_error", message: "Brevo couldn't be reached" })
  })

  it("Brevo's daily limit stops the send and says so", async () => {
    vi.stubEnv("BREVO_API_KEY", "k")
    const mailer = brevoMailer(fakeBrevo({ "/smtp/email": { status: 402, body: { code: "not_enough_credits", message: "Your daily limit is reached" } } }).fetchFn)!
    const result = await sendInBatches(mailer, "x <x@x.test>", ["a@x.test", "b@x.test"], async (batch) => batch.map((to) => ({ to, subject: "s", html: "h" })), { sleepFn: async () => {} })
    expect(result).toEqual({ sent: 0, failed: 2, failedTo: ["a@x.test", "b@x.test"], error: "Brevo: Your daily limit is reached" })
  })
})

describe("campaigns: leads through Brevo, everyone else through Resend", () => {
  beforeEach(() => {
    viaResend.length = 0
    viaBrevo.length = 0
  })
  async function seedMixed() {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: [lead("asha@example.test", { firstName: "Asha" }), lead("ravi@example.test")] })
    store.campaigns = [{ id: "c1", subject: "Hello {{firstName}}", body: "Hello.", status: "active", design: null }]
    store.recipients = [
      recipient({ id: "r0", email: "asha@example.test" }),
      recipient({ id: "r1", email: "typed@example.test" }),
      recipient({ id: "r2", email: "ravi@example.test" }),
    ]
  }
  const sentToday = (n: number, provider: string | null) => {
    for (let i = 0; i < n; i++) store.recipients.push(recipient({ campaignId: "old", email: `old${i}@example.test`, status: "sent", sentAt: new Date(), provider }))
  }
  const send = (recipientIds: string[], mailers: { brevo?: BatchMailer | null } = { brevo }) =>
    sendCampaignBatch({ campaignId: "c1", recipientIds, adminEmail: ADMIN, resend, from: "CarouseLabs <support@carouselabs.com>", ...mailers })

  it("splits one batch between them, and records what sent each", async () => {
    await seedMixed()
    expect(await send(["r0", "r1", "r2"])).toMatchObject({ sent: 3, failed: 0 })
    expect(viaBrevo.flat().map((e) => e.to)).toEqual(["asha@example.test", "ravi@example.test"])
    expect(viaResend.flat().map((e) => e.to)).toEqual(["typed@example.test"])
    expect(store.recipients.filter((r) => r.campaignId === "c1").map((r) => [r.email, r.status, r.provider])).toEqual([
      ["asha@example.test", "sent", "brevo"],
      ["typed@example.test", "sent", null],
      ["ravi@example.test", "sent", "brevo"],
    ])
  })

  it("each has its own daily limit", async () => {
    await seedMixed()
    sentToday(CAMPAIGN_DAILY_LIMIT, null)
    // Resend's 80 are used up; leads still go.
    await expect(send(["r1"])).rejects.toThrow(/Today's limit is used up/)
    expect((await send(["r0"])).sent).toBe(1)
    sentToday(BREVO_DAILY_LIMIT - 2, "brevo")
    // 279 today: r0 already went, so only r2 is new, and it fits.
    await expect(send(["r2", "r0"])).resolves.toMatchObject({ sent: 1, skipped: 1 })
    await importLeads({ adminEmail: ADMIN, listName: "Day 2", columns: [], leads: [lead("sam@example.test")] })
    store.recipients.push(recipient({ id: "r3", email: "sam@example.test" }))
    await expect(send(["r3"])).rejects.toThrow(/Today's Brevo limit is used up \(280 emails a day through Brevo's free plan\)/)
    expect((await campaignAllowance({ audience: "leads:all" })).left).toBe(0)
    expect(await campaignAllowance({ audience: "all" })).toMatchObject({ via: "resend", left: 0, limit: CAMPAIGN_DAILY_LIMIT })
  })

  it("lead emails don't use up Resend's limit for users", async () => {
    await seedMixed()
    sentToday(100, "brevo")
    expect(await campaignAllowance({ audience: "all" })).toMatchObject({ via: "resend", sentToday: 0, left: CAMPAIGN_DAILY_LIMIT })
    expect(await campaignAllowance({ audience: "leads:new" })).toMatchObject({ via: "brevo", sentToday: 100, left: BREVO_DAILY_LIMIT - 100 })
    // A users' campaign set to Brevo counts against Brevo's.
    expect(await campaignAllowance({ audience: "all", via: "brevo" })).toMatchObject({ via: "brevo" })
    expect(await campaignAllowance({ audience: "leads:new", via: "resend" })).toMatchObject({ via: "resend" })
    expect((await send(["r1"])).sent).toBe(1)
  })

  it("says how many more leads can go", async () => {
    await seedMixed()
    sentToday(BREVO_DAILY_LIMIT - 1, "brevo")
    await expect(send(["r0", "r2"])).rejects.toThrow(/You can send 1 more through Brevo today/)
    expect(store.recipients.filter((r) => r.campaignId === "c1").every((r) => r.status === "pending")).toBe(true)
  })

  it("without Brevo set up, leads aren't sent and nobody is claimed", async () => {
    await seedMixed()
    await expect(send(["r0", "r1"], { brevo: null })).rejects.toThrow(BREVO_MISSING)
    expect(store.recipients.filter((r) => r.campaignId === "c1").every((r) => r.status === "pending")).toBe(true)
    // Users still send.
    expect((await send(["r1"], { brevo: null })).sent).toBe(1)
  })

  it("before the SQL's Brevo part is run: users send exactly as before, leads wait", async () => {
    await seedMixed()
    store.columnsMissing = true
    expect((await send(["r1"])).sent).toBe(1)
    expect(store.recipients.find((r) => r.id === "r1")).not.toHaveProperty("provider")
    await expect(send(["r0"])).rejects.toThrow(/Run scripts\/leads.sql/)
    expect(viaBrevo).toEqual([])
  })
})

describe("Brevo telling us who to stop emailing", () => {
  const hook = (body: unknown, auth: { token?: string | null; bearer?: string } = {}) => {
    const token = auth.token === undefined ? brevoWebhookToken() : auth.token
    return brevoWebhook(
      new Request(`https://carouselabs.com/api/webhooks/brevo${token ? `?token=${token}` : ""}`, {
        method: "POST",
        headers: auth.bearer ? { authorization: `Bearer ${auth.bearer}` } : {},
        body: JSON.stringify(body),
      }),
    )
  }
  async function seedFive() {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: ["a", "b", "c", "d", "e"].map((x) => lead(`${x}@example.test`)) })
  }

  it("refuses a call without our token", async () => {
    await seedFive()
    expect((await hook({ event: "unsubscribed", email: "a@example.test" }, { token: null })).status).toBe(401)
    expect((await hook({ event: "unsubscribed", email: "a@example.test" }, { token: "x".repeat(32) })).status).toBe(401)
    expect(leadByEmail("a@example.test").unsubscribedAt).toBeNull()
  })

  it("stops each lead Brevo stopped, saying why; anything else is ignored", async () => {
    await seedFive()
    const events = [
      { event: "unsubscribed", email: "A@Example.test" },
      { event: "spam", email: "b@example.test" },
      { event: "hard_bounce", email: "c@example.test" },
      { event: "invalid_email", email: "d@example.test" },
      { event: "blocked", email: "nobody@example.test" },
      { event: "delivered", email: "e@example.test" },
      { event: "opened", email: "e@example.test" },
    ]
    const res = await hook(events)
    expect(await res.json()).toEqual({ ok: true, stopped: 4 })
    expect(["a", "b", "c", "d", "e"].map((x) => leadByEmail(`${x}@example.test`).stopReason ?? null)).toEqual(["unsubscribed", "spam", "bounced", "bounced", null])
    expect(leadByEmail("e@example.test").unsubscribedAt).toBeNull()
  })

  it("takes one event at a time too, by bearer token, and keeps the first reason", async () => {
    await seedFive()
    expect((await hook({ event: "spam", email: "a@example.test" }, { token: null, bearer: brevoWebhookToken()! })).status).toBe(200)
    await hook({ event: "hard_bounce", email: "a@example.test" })
    expect(leadByEmail("a@example.test")).toMatchObject({ stopReason: "spam", unsubscribedAt: expect.any(Date) })
  })

  it("still stops them before the SQL's Brevo part is run, just without the reason", async () => {
    await seedFive()
    store.columnsMissing = true
    expect(await stopLeadByEmail("a@example.test", "bounced")).toBe(1)
    expect(await unsubscribeLead(leadByEmail("b@example.test").id)).toBe(true)
    expect(leadByEmail("a@example.test")).toMatchObject({ unsubscribedAt: expect.any(Date) })
    expect(leadByEmail("a@example.test")).not.toHaveProperty("stopReason")
    expect(leadByEmail("b@example.test").unsubscribedAt).toBeInstanceOf(Date)
  })
})

describe("Brevo setup on the Leads page", () => {
  const ready = {
    "/senders/domains": { body: { domains: [{ domain_name: "carouselabs.com", authenticated: true }] } },
    "/senders": { body: { senders: [{ email: "Support@carouselabs.com", active: true }] } },
    "/webhooks": { body: { webhooks: [{ url: `https://carouselabs.com/api/webhooks/brevo?token=${"t"}` }] } },
  }

  it("says what's missing: the key, the sender, the domain, the webhook", async () => {
    vi.stubEnv("BREVO_API_KEY", "")
    expect(await brevoStatus("support@carouselabs.com")).toEqual({ key: false })
    vi.stubEnv("BREVO_API_KEY", "k")
    expect(await brevoStatus("support@carouselabs.com", fakeBrevo(ready).fetchFn)).toEqual({
      key: true,
      sender: { email: "support@carouselabs.com", active: true },
      domain: { name: "carouselabs.com", authenticated: true },
      webhook: true,
    })
    // A new account: Brevo answers the webhook list with "Webhook record does not exist".
    const noWebhooks = { status: 400, body: { code: "document_not_found", message: "Webhook record does not exist" } }
    const fresh = fakeBrevo({ "/senders/domains": { body: { domains: [] } }, "/senders": { body: { senders: [{ email: "carouselabs@gmail.com", active: true }] } }, "/webhooks": noWebhooks })
    expect(await brevoStatus("support@carouselabs.com", fresh.fetchFn)).toEqual({ key: true, sender: null, domain: null, webhook: false })
    const wrongKey = fakeBrevo({ "/senders": { status: 401, body: { code: "unauthorized", message: "Key not found" } } })
    expect(await brevoStatus("support@carouselabs.com", wrongKey.fetchFn)).toMatchObject({ key: true, error: "Key not found" })
  })

  it("turns on the webhook once, protected by our token, for the events that stop a lead", async () => {
    vi.stubEnv("BREVO_API_KEY", "k")
    const brevoApi = fakeBrevo({
      "/webhooks?type": { status: 400, body: { code: "document_not_found", message: "Webhook record does not exist" } },
      "/webhooks": { status: 201, body: { id: 5 } },
    })
    await connectBrevoWebhook(brevoApi.fetchFn)
    const made = brevoApi.calls.find((c) => c.init.method === "POST")!
    expect(made.url).toBe("https://api.brevo.com/v3/webhooks")
    expect(made.body).toMatchObject({
      type: "transactional",
      url: `https://carouselabs.com/api/webhooks/brevo?token=${brevoWebhookToken()}`,
      events: ["unsubscribed", "spam", "hardBounce", "invalid", "blocked"],
    })
    // Already there: nothing new is made.
    const again = fakeBrevo({ "/webhooks": { body: { webhooks: [{ url: made.body.url }] } } })
    await connectBrevoWebhook(again.fetchFn)
    expect(again.calls.some((c) => c.init.method === "POST")).toBe(false)
    vi.stubEnv("BREVO_API_KEY", "")
    await expect(connectBrevoWebhook(again.fetchFn)).rejects.toThrow(BREVO_MISSING)
  })

  it("the admin route answers with the checks and today's lead emails, for admins only", async () => {
    vi.stubEnv("BREVO_API_KEY", "")
    const res = await brevoGet()
    expect(await res.json()).toEqual({ status: { key: false }, from: "support@carouselabs.com", today: { via: "brevo", limit: BREVO_DAILY_LIMIT, sentToday: 0, left: BREVO_DAILY_LIMIT } })
    store.admin = null
    expect((await brevoGet()).status).toBe(403)
  })
})

// ── Choosing what sends it and who it's from ────────────────────────────

describe("the senders to pick from", () => {
  const brevoSenderList = (senders: { email: string; name: string; active: boolean }[]) => fakeBrevo({ "/senders": { body: { senders } } }).fetchFn

  it("support@ and every carouselabs.com sender added in Brevo: nothing else", async () => {
    vi.stubEnv("BREVO_API_KEY", "k")
    const fetchFn = brevoSenderList([
      { email: "support@carouselabs.com", name: "CarouseLabs", active: true },
      { email: "Anant@CarouseLabs.com", name: "Anant from CarouseLabs", active: true },
      { email: "carouselabs@gmail.com", name: "CarouseLabs", active: true },
      { email: "old@carouselabs.com", name: "Old", active: false },
    ])
    expect(await senderChoices(fetchFn)).toEqual({
      brevoKnown: true,
      senders: [
        { name: "CarouseLabs", email: "support@carouselabs.com", inBrevo: true },
        { name: "Anant from CarouseLabs", email: "anant@carouselabs.com", inBrevo: true },
      ],
    })
    vi.stubEnv("BREVO_API_KEY", "")
    expect(await senderChoices(fetchFn)).toEqual({ brevoKnown: false, senders: [{ name: "CarouseLabs", email: "support@carouselabs.com", inBrevo: false }] })
  })

  it("checks a choice: on the list, replies to the list, and in Brevo when Brevo sends", async () => {
    vi.stubEnv("BREVO_API_KEY", "k")
    const fetchFn = brevoSenderList([{ email: "anant@carouselabs.com", name: "Anant", active: true }])
    expect(await resolveSending({ via: "auto", fromEmail: "support@carouselabs.com" }, true, fetchFn)).toEqual({ sending: DEFAULT_SENDING })
    expect(await resolveSending({ via: "resend", fromEmail: "Anant@carouselabs.com", replyTo: "support@carouselabs.com" }, false, fetchFn)).toEqual({
      sending: { via: "resend", from: "Anant <anant@carouselabs.com>", replyTo: "support@carouselabs.com" },
    })
    // Replies to the sender itself: nothing extra.
    expect(await resolveSending({ via: "brevo", fromEmail: "anant@carouselabs.com", replyTo: "anant@carouselabs.com" }, true, fetchFn)).toEqual({
      sending: { via: "brevo", from: "Anant <anant@carouselabs.com>", replyTo: null },
    })
    expect(await resolveSending({ via: "auto", fromEmail: "ceo@carouselabs.com" }, false, fetchFn)).toEqual({ problem: expect.stringMatching(/isn't one of your senders/) })
    expect(await resolveSending({ via: "auto", fromEmail: "anant@carouselabs.com", replyTo: "x@gmail.com" }, false, fetchFn)).toEqual({ problem: expect.stringMatching(/replies can't go there/) })
    // support@ isn't in this Brevo account: fine for Resend, not when Brevo sends.
    expect(await resolveSending({ via: "resend", fromEmail: "support@carouselabs.com", replyTo: "anant@carouselabs.com" }, false, fetchFn)).toHaveProperty("sending")
    expect(await resolveSending({ via: "brevo", fromEmail: "support@carouselabs.com" }, true, fetchFn)).toEqual({ problem: expect.stringMatching(/isn't a sender in Brevo yet/) })
  })
})

describe("a campaign's service and sender", () => {
  beforeEach(() => {
    viaResend.length = 0
    viaBrevo.length = 0
  })
  const anant = { via: "brevo" as const, from: "Anant <anant@carouselabs.com>", replyTo: "support@carouselabs.com" }
  async function seed(sending: Partial<{ sendVia: string; sendFrom: string; replyTo: string }> = {}) {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: [lead("asha@example.test", { firstName: "Asha" })] })
    store.campaigns = [{ id: "c1", subject: "Hello", body: "Hello there.", status: "active", design: null, audience: "custom", ...sending }]
    store.recipients = [recipient({ id: "r0", email: "asha@example.test" }), recipient({ id: "r1", userId: null, email: "typed@example.test" })]
  }
  const send = (ids: string[]) => sendCampaignBatch({ campaignId: "c1", recipientIds: ids, adminEmail: ADMIN, resend, brevo, from: "CarouseLabs <support@carouselabs.com>" })

  it("is kept with the campaign; the defaults keep nothing", async () => {
    await importLeads({ adminEmail: ADMIN, listName: "Day 1", columns: [], leads: [lead("asha@example.test")] })
    await createCampaign({ adminEmail: ADMIN, subject: "Hi", body: "Hi.", recipients: "leads:all", audienceValue: null, sending: anant })
    expect(store.campaigns[0]).toMatchObject({ sendVia: "brevo", sendFrom: anant.from, replyTo: anant.replyTo })
    expect(await campaignSending(store.campaigns[0].id)).toEqual(anant)
    await createCampaign({ adminEmail: ADMIN, subject: "Hi", body: "Hi.", recipients: "leads:all", audienceValue: null })
    expect(store.campaigns[1]).not.toHaveProperty("sendVia")
    expect(await campaignSending(store.campaigns[1].id)).toEqual(DEFAULT_SENDING)
  })

  it("everyone through Brevo, from its sender, with replies elsewhere", async () => {
    await seed({ sendVia: "brevo", sendFrom: anant.from, replyTo: anant.replyTo })
    expect((await send(["r0", "r1"])).sent).toBe(2)
    expect(viaResend).toEqual([])
    expect(viaBrevo.flat().map((e) => [e.to, e.from, e.replyTo])).toEqual([
      ["asha@example.test", anant.from, anant.replyTo],
      ["typed@example.test", anant.from, anant.replyTo],
    ])
    expect(store.recipients.map((r) => r.provider)).toEqual(["brevo", "brevo"])
    // The lead still gets their Unsubscribe link.
    expect(viaBrevo.flat()[0].html).toContain("/api/unsubscribe/")
  })

  it("everyone through Resend, leads too (with their Unsubscribe link)", async () => {
    await seed({ sendVia: "resend" })
    expect((await send(["r0", "r1"])).sent).toBe(2)
    expect(viaBrevo).toEqual([])
    expect(viaResend.flat().map((e) => [e.to, e.from])).toEqual([
      ["asha@example.test", "CarouseLabs <support@carouselabs.com>"],
      ["typed@example.test", "CarouseLabs <support@carouselabs.com>"],
    ])
    expect(viaResend.flat()[0].html).toContain("/api/unsubscribe/")
    expect(store.recipients.map((r) => r.provider ?? null)).toEqual([null, null])
  })

  it("can be changed for the rest of a campaign, checked the same way", async () => {
    vi.stubEnv("BREVO_API_KEY", "")
    await seed()
    await setCampaignSending("c1", { via: "resend", fromEmail: "support@carouselabs.com", replyTo: null }, ADMIN)
    expect(store.campaigns[0]).toMatchObject({ sendVia: "resend", sendFrom: "CarouseLabs <support@carouselabs.com>", replyTo: null })
    await expect(setCampaignSending("c1", { via: "auto", fromEmail: "ceo@carouselabs.com" }, ADMIN)).rejects.toThrow(/isn't one of your senders/)
    // Back to the defaults: the columns are emptied.
    await setCampaignSending("c1", { via: "auto", fromEmail: "support@carouselabs.com" }, ADMIN)
    expect(store.campaigns[0]).toMatchObject({ sendVia: null, sendFrom: null, replyTo: null })
    expect(store.audit.at(-1)).toMatchObject({ action: "SET_CAMPAIGN_SENDING" })
    expect((await getCampaign("c1"))?.sending).toEqual(DEFAULT_SENDING)
  })

  it("the campaigns route checks the choice before making anything", async () => {
    vi.stubEnv("BREVO_API_KEY", "")
    const res = await campaignsPost(
      new Request("https://admin.carouselabs.com/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({ subject: "Hi", body: "Hi.", recipients: ["typed@example.test"], sending: { via: "resend", fromEmail: "ceo@carouselabs.com" } }),
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/isn't one of your senders/)
    expect(store.campaigns).toEqual([])
  })

  it("before scripts/email-sending.sql: campaigns use the defaults; choosing anything else says to run it", async () => {
    await seed({ sendVia: "brevo" })
    store.columnsMissing = true
    // Reading the choice fails over to the defaults; sending users still works (leads wait for leads.sql's part).
    expect(await campaignSending("c1")).toEqual(DEFAULT_SENDING)
    expect((await send(["r1"])).sent).toBe(1)
    await expect(createCampaign({ adminEmail: ADMIN, subject: "Hi", body: "Hi.", recipients: ["typed@example.test"], audienceValue: null, sending: anant })).rejects.toThrow(SENDING_SQL_MISSING)
    expect((await createCampaign({ adminEmail: ADMIN, subject: "Hi", body: "Hi.", recipients: ["new@example.test"], audienceValue: null })).total).toBe(1)
  })
})

// ── All leads, lists you make, smart lists, one lead ─────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)
const idOf = (email: string) => leadByEmail(email).id

// Four leads on two lists: two at banks, one on both lists, one from a meetup.
// Asha saw and clicked the bank email, Ravi saw it 40 days ago, Priya got it
// and never opened it, and Dev's didn't send.
async function seedFinding() {
  const banks = await importLeads({
    adminEmail: ADMIN,
    listName: "Banks",
    columns: [
      { key: "company", label: "Company" },
      { key: "city", label: "City" },
    ],
    leads: [
      lead("asha@hdfc.test", { name: "Asha Shah", fields: { company: "HDFC Bank", city: "Mumbai" } }),
      lead("ravi@icici.test", { firstName: "Ravi", fields: { company: "ICICI Bank", city: "Delhi" } }),
      lead("priya@acme.test", { name: "Priya", fields: { company: "Acme" } }),
    ],
  })
  const meetup = await importLeads({ adminEmail: ADMIN, listName: "Meetup", columns: [{ key: "role", label: "Role" }], leads: [lead("dev@globex.test", { fields: { role: "CTO" } }), lead("priya@acme.test")] })
  store.campaigns.push({ id: "c1", subject: "Hello banks", body: "", status: "active", design: null })
  store.recipients.push(
    recipient({ campaignId: "c1", email: "asha@hdfc.test", status: "sent", sentAt: daysAgo(2), openedAt: daysAgo(2), clickedAt: daysAgo(1) }),
    recipient({ campaignId: "c1", email: "ravi@icici.test", status: "sent", sentAt: daysAgo(40), openedAt: daysAgo(40) }),
    recipient({ campaignId: "c1", email: "priya@acme.test", status: "sent", sentAt: daysAgo(3) }),
    recipient({ campaignId: "c1", email: "dev@globex.test", status: "failed", error: "Mailbox full" }),
  )
  return { banks: banks.listId, meetup: meetup.listId }
}
const emailsOf = async (filter: LeadFilter, page = 1) => (await listLeads({ filter, page })).leads.map((l) => l.email)

describe("pasting leads", () => {
  it("one per line: an address, a name with it either side, or Name <address>", () => {
    const pasted = parsePastedLeads(
      ["asha@acme.test", "Ravi Kumar <Ravi@Globex.test>", '"Priya Shah", priya@initech.test', "kiran@x.test; Kiran", "Meera\tmeera@y.test", "", "not an email", "ASHA@acme.test"].join("\n"),
    )
    expect(pasted.leads.map((l) => [l.email, l.name])).toEqual([
      ["asha@acme.test", null],
      ["ravi@globex.test", "Ravi Kumar"],
      ["priya@initech.test", "Priya Shah"],
      ["kiran@x.test", "Kiran"],
      ["meera@y.test", "Meera"],
    ])
    expect(pasted).toMatchObject({ invalid: 1, duplicates: 1 })
  })
})

describe("the filters", () => {
  const asha = { email: "asha@hdfc.test", firstName: null, lastName: null, name: "Asha Shah", fields: { company: "HDFC Bank" } }

  it("a column: contains, is, empty, has a value, in any case; their own name and email too", () => {
    const has = (field: LeadFilter["field"]) => matchesInMemory(asha, NO_ENGAGEMENT, { field })
    expect(has({ key: "company", op: "contains", value: "BANK" })).toBe(true)
    expect(has({ key: "company", op: "contains", value: "icici" })).toBe(false)
    expect(has({ key: "company", op: "is", value: "hdfc bank" })).toBe(true)
    expect(has({ key: "company", op: "is", value: "hdfc" })).toBe(false)
    expect(has({ key: "company", op: "empty" })).toBe(false)
    expect(has({ key: "city", op: "empty" })).toBe(true)
    expect(has({ key: "company", op: "not_empty" })).toBe(true)
    expect(has({ key: "city", op: "not_empty" })).toBe(false)
    expect(has({ key: "name", op: "contains", value: "shah" })).toBe(true)
    expect(has({ key: "email", op: "contains", value: "@hdfc" })).toBe(true)
  })

  it("what they did with the emails, within so many days", () => {
    const e: Engagement = { emails: 2, lastSentAt: daysAgo(2), lastSeenAt: daysAgo(40), lastClickedAt: null }
    const did = (activity: LeadFilter["activity"], days?: number, engagement = e) => matchesInMemory(asha, engagement, { activity, days })
    expect(did("emailed", 7)).toBe(true)
    expect(did("emailed", 1)).toBe(false)
    expect(did("seen")).toBe(true)
    expect(did("seen", 30)).toBe(false)
    expect(did("not_seen")).toBe(false)
    expect(did("clicked")).toBe(false)
    expect(did("not_clicked")).toBe(true)
    expect(did("never")).toBe(false)
    // Never emailed is "never", not "emailed and never seen".
    expect(did("never", undefined, NO_ENGAGEMENT)).toBe(true)
    expect(did("not_seen", undefined, NO_ENGAGEMENT)).toBe(false)
  })

  it("in words, for a smart list", () => {
    expect(
      describeFilter(
        { activity: "clicked", days: 30, field: { key: "company", op: "contains", value: "bank" }, status: "active", listId: "l1", addedDays: 7, q: "shah" },
        { lists: { l1: "Banks" }, columns: { company: "Company" } },
      ),
    ).toBe('Clicked in the last 30 days · Company contains "bank" · Can be emailed · on "Banks" · added in the last 7 days · matching "shah"')
    expect(describeFilter({ activity: "never", days: 30 })).toBe("Never emailed")
    expect(describeFilter({})).toBe("Every lead")
    expect(isEmptyFilter({})).toBe(true)
    expect(isEmptyFilter({ status: "active" })).toBe(false)
  })
})

describe("all leads in one table", () => {
  it("everyone, newest first, with their lists and what they did with the emails", async () => {
    const { banks, meetup } = await seedFinding()
    const page = await listLeads({ filter: {} })
    expect(page).toMatchObject({ page: 1, pageSize: 50, total: 4 })
    expect(page.leads.map((l) => l.email)).toEqual(["dev@globex.test", "priya@acme.test", "ravi@icici.test", "asha@hdfc.test"])
    const priya = page.leads[1]
    expect(priya.lists).toEqual([
      { id: banks, name: "Banks" },
      { id: meetup, name: "Meetup" },
    ])
    const asha = page.leads[3]
    expect(asha).toMatchObject({ name: "Asha Shah", emailCount: 1, fields: { company: "HDFC Bank", city: "Mumbai" } })
    expect(asha.lastSeenAt).toBeInstanceOf(Date)
    expect(asha.lastClickedAt).toBeInstanceOf(Date)
    // An email that didn't send isn't counted.
    expect(page.leads[0]).toMatchObject({ emailCount: 0, lastSeenAt: null, lastClickedAt: null })
  })

  it("narrowed by search, list, status, a column, what they did and when they were added", async () => {
    const { banks, meetup } = await seedFinding()
    await stopLeadByEmail("ravi@icici.test", "bounced")
    expect(await emailsOf({ q: "SHAH" })).toEqual(["asha@hdfc.test"])
    expect(await emailsOf({ listId: meetup })).toEqual(["dev@globex.test", "priya@acme.test"])
    expect(await emailsOf({ status: "active" })).toEqual(["dev@globex.test", "priya@acme.test", "asha@hdfc.test"])
    expect(await emailsOf({ status: "stopped" })).toEqual(["ravi@icici.test"])
    expect(await emailsOf({ status: "bounced" })).toEqual(["ravi@icici.test"])
    expect(await emailsOf({ status: "unsubscribed" })).toEqual([])
    expect(await emailsOf({ field: { key: "company", op: "contains", value: "bank" } })).toEqual(["ravi@icici.test", "asha@hdfc.test"])
    expect(await emailsOf({ activity: "clicked", days: 7 })).toEqual(["asha@hdfc.test"])
    expect(await emailsOf({ activity: "seen", days: 30 })).toEqual(["asha@hdfc.test"])
    expect(await emailsOf({ activity: "seen" })).toEqual(["ravi@icici.test", "asha@hdfc.test"])
    expect(await emailsOf({ activity: "never" })).toEqual(["dev@globex.test"])
    expect(await emailsOf({ activity: "not_seen" })).toEqual(["priya@acme.test"])
    expect(await emailsOf({ listId: banks, activity: "not_clicked" })).toEqual(["priya@acme.test", "ravi@icici.test"])
    for (const l of store.leads) l.createdAt = daysAgo(30)
    leadByEmail("dev@globex.test").createdAt = daysAgo(1)
    expect(await emailsOf({ addedDays: 7 })).toEqual(["dev@globex.test"])
    expect((await listLeads({ filter: { addedDays: 90 } })).total).toBe(4)
  })

  it("a page at a time, whether the database or the column filter finds them", async () => {
    await seedFinding()
    await importLeads({ adminEmail: ADMIN, listName: "Bulk", columns: [], leads: Array.from({ length: 55 }, (_, i) => lead(`p${i}@bulk.test`)) })
    const second = await listLeads({ filter: {}, page: 2 })
    expect(second).toMatchObject({ page: 2, total: 59 })
    expect(second.leads).toHaveLength(9)
    expect(second.leads.at(-1)?.email).toBe("asha@hdfc.test")
    const columned = await listLeads({ filter: { field: { key: "email", op: "contains", value: "@bulk" } }, page: 2 })
    expect(columned).toMatchObject({ page: 2, total: 55 })
    expect(columned.leads).toHaveLength(5)
  })
})

describe("lists you make", () => {
  it("an empty list, filled by ticking leads; it learns their columns, and nobody is on it twice", async () => {
    await seedFinding()
    const { id } = await createLeadList({ admin: ADMIN, name: "  Shortlist ", kind: "static" })
    expect(store.lists.find((l) => l.id === id)).toMatchObject({ name: "Shortlist", createdBy: ADMIN })
    expect(store.members.filter((m) => m.listId === id)).toHaveLength(0)
    expect(await bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("asha@hdfc.test"), idOf("dev@globex.test")], listId: id })).toEqual({ affected: 2, kept: 0, listId: id })
    expect((await bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("asha@hdfc.test"), idOf("priya@acme.test")], listId: id })).affected).toBe(1)
    expect(store.members.filter((m) => m.listId === id)).toHaveLength(3)
    expect(store.lists.find((l) => l.id === id)?.columns).toEqual([
      { key: "company", label: "Company" },
      { key: "city", label: "City" },
      { key: "role", label: "Role" },
    ])
    expect(store.audit.map((a) => a.action)).toEqual(expect.arrayContaining(["CREATE_LEAD_LIST", "ADD_TO_LEAD_LIST"]))
    await expect(createLeadList({ admin: ADMIN, name: "   ", kind: "static" })).rejects.toThrow("Name the list")
  })

  it("ticked leads can go on a new list named there, and so can everyone a filter finds", async () => {
    await seedFinding()
    const hot = await bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("asha@hdfc.test"), idOf("dev@globex.test")], newListName: "Hot" })
    expect(store.lists.find((l) => l.id === hot.listId)?.name).toBe("Hot")
    expect(store.members.filter((m) => m.listId === hot.listId).map((m) => m.leadId)).toEqual([idOf("asha@hdfc.test"), idOf("dev@globex.test")])
    const banks = await bulkLeads({ admin: ADMIN, action: "add", filter: { field: { key: "company", op: "contains", value: "bank" } }, newListName: "Bank people" })
    expect(banks.affected).toBe(2)
    await expect(bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("asha@hdfc.test")], newListName: " " })).rejects.toThrow("Name the new list")
    await expect(bulkLeads({ admin: ADMIN, action: "add", ids: [], newListName: "Empty" })).rejects.toThrow("Pick at least one lead")
    await expect(bulkLeads({ admin: ADMIN, action: "add", filter: { q: "nobody" }, newListName: "Empty" })).rejects.toThrow("Pick at least one lead")
    await expect(bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("asha@hdfc.test")], listId: "gone" })).rejects.toMatchObject({ status: 404 })
  })

  it("taking leads off a list keeps them saved; deleting leads keeps anyone who stopped", async () => {
    const { banks } = await seedFinding()
    expect((await bulkLeads({ admin: ADMIN, action: "remove", ids: [idOf("asha@hdfc.test")], listId: banks })).affected).toBe(1)
    expect(leadByEmail("asha@hdfc.test")).toBeDefined()
    expect(store.members.some((m) => m.listId === banks && m.leadId === idOf("asha@hdfc.test"))).toBe(false)
    expect(store.members.filter((m) => m.listId === banks)).toHaveLength(2)
    await expect(bulkLeads({ admin: ADMIN, action: "remove", ids: [idOf("ravi@icici.test")] })).rejects.toThrow("Which list?")

    await unsubscribeLead(idOf("ravi@icici.test"))
    const priya = idOf("priya@acme.test")
    expect(await bulkLeads({ admin: ADMIN, action: "delete", ids: [idOf("ravi@icici.test"), priya] })).toEqual({ affected: 1, kept: 1 })
    expect(store.leads.map((l) => l.email).sort()).toEqual(["asha@hdfc.test", "dev@globex.test", "ravi@icici.test"])
    expect(store.members.some((m) => m.leadId === priya)).toBe(false)
    expect(store.audit.at(-1)).toMatchObject({ action: "DELETE_LEADS" })
  })

  it("renaming; deleting a list can keep its leads, or delete the ones only on it", async () => {
    const { banks, meetup } = await seedFinding()
    await updateLeadList(banks, { admin: ADMIN, name: " Bank leads " })
    expect(store.lists.find((l) => l.id === banks)?.name).toBe("Bank leads")
    expect(store.audit.at(-1)).toMatchObject({ action: "UPDATE_LEAD_LIST" })
    await expect(updateLeadList(banks, { admin: ADMIN, name: "  " })).rejects.toThrow("Name the list")
    await expect(updateLeadList("gone", { admin: ADMIN, name: "x" })).rejects.toMatchObject({ status: 404 })

    expect(await deleteLeadList(meetup, ADMIN, { withLeads: false })).toEqual({ removed: 0 })
    expect(leadByEmail("dev@globex.test")).toBeDefined()
    expect(await deleteLeadList(banks, ADMIN)).toEqual({ removed: 3 })
    expect(store.leads.map((l) => l.email)).toEqual(["dev@globex.test"])
  })
})

describe("smart lists", () => {
  it("are whoever matches the filter now, and change by themselves", async () => {
    await seedFinding()
    const { id } = await createLeadList({ admin: ADMIN, name: "Seen it", kind: "smart", filter: { activity: "seen" } })
    const seen = (await leadsOverview()).lists.find((l) => l.id === id)
    expect(seen).toMatchObject({ name: "Seen it", kind: "smart", filter: { activity: "seen" }, count: 2, columns: [] })
    expect(await emailsOf({ listId: id })).toEqual(["ravi@icici.test", "asha@hdfc.test"])
    // Priya opens the email: she's on it now.
    store.recipients.find((r) => r.email === "priya@acme.test")!.openedAt = new Date()
    expect((await leadsOverview()).lists.find((l) => l.id === id)?.count).toBe(3)
    // More filters narrow it further.
    expect(await emailsOf({ listId: id, field: { key: "company", op: "contains", value: "hdfc" } })).toEqual(["asha@hdfc.test"])
    expect(store.audit.at(-1)).toMatchObject({ action: "CREATE_LEAD_LIST", details: '"Seen it" (smart: Seen an email)' })
  })

  it("can be built on a fixed list, and a campaign to one goes to whoever matches it then, oldest first", async () => {
    const { banks } = await seedFinding()
    const { id } = await createLeadList({ admin: ADMIN, name: "Banks that saw it", kind: "smart", filter: { listId: banks, activity: "seen" } })
    expect(await emailsOf({ listId: id })).toEqual(["ravi@icici.test", "asha@hdfc.test"])
    expect((await resolveLeadAudience(`leads:list:${id}`)).map((p) => p.email)).toEqual(["asha@hdfc.test", "ravi@icici.test"])
    // Not anyone who stopped, nor anyone who has since signed up.
    await unsubscribeLead(idOf("ravi@icici.test"))
    store.users.push({ id: "u9", email: "asha@hdfc.test" })
    expect(await resolveLeadAudience(`leads:list:${id}`)).toEqual([])
    // Its merge fields are every column: its people can come from any list.
    expect((await leadFieldKeys(id)).map((c) => c.key)).toEqual(["role", "company", "city"])
    expect((await leadFieldKeys(banks)).map((c) => c.key)).toEqual(["company", "city"])
  })

  it("need a filter, can't be built on another smart list or themselves, and can't be filled by hand", async () => {
    const { banks } = await seedFinding()
    await expect(createLeadList({ admin: ADMIN, name: "Everyone", kind: "smart", filter: {} })).rejects.toThrow("Pick at least one filter")
    await expect(createLeadList({ admin: ADMIN, name: "Everyone", kind: "smart" })).rejects.toThrow("Pick at least one filter")
    const { id } = await createLeadList({ admin: ADMIN, name: "Clicked", kind: "smart", filter: { activity: "clicked" } })
    await expect(createLeadList({ admin: ADMIN, name: "On clicked", kind: "smart", filter: { listId: id, status: "active" } })).rejects.toThrow("another smart list")
    await expect(updateLeadList(id, { admin: ADMIN, filter: { listId: id } })).rejects.toThrow("built on itself")
    await expect(updateLeadList(id, { admin: ADMIN, filter: {} })).rejects.toThrow("Pick at least one filter")
    await expect(updateLeadList(banks, { admin: ADMIN, filter: { activity: "seen" } })).rejects.toThrow("Only a smart list has a filter")
    await expect(bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("dev@globex.test")], listId: id })).rejects.toThrow("fills itself")
    await expect(bulkLeads({ admin: ADMIN, action: "remove", ids: [idOf("asha@hdfc.test")], listId: id })).rejects.toThrow("fills itself")
    await expect(importLeads({ adminEmail: ADMIN, listId: id, listName: "Clicked", columns: [], leads: [lead("new@example.test")] })).rejects.toThrow("fills itself")
    expect(store.members.some((m) => m.listId === id)).toBe(false)
  })

  it("changing the filter changes who's on it; deleting one never deletes anyone", async () => {
    await seedFinding()
    const { id } = await createLeadList({ admin: ADMIN, name: "Watching", kind: "smart", filter: { activity: "seen" } })
    await updateLeadList(id, { admin: ADMIN, filter: { activity: "clicked" } })
    expect(store.lists.find((l) => l.id === id)?.filter).toEqual({ activity: "clicked" })
    expect(await emailsOf({ listId: id })).toEqual(["asha@hdfc.test"])
    expect(await deleteLeadList(id, ADMIN)).toEqual({ removed: 0 })
    expect(store.leads).toHaveLength(4)
    expect(store.audit.at(-1)).toMatchObject({ action: "DELETE_LEAD_LIST", details: 'Smart list "Watching"' })
  })

  it("before scripts/lead-lists.sql: lists work as before, and a smart list says to run it", async () => {
    store.listsSqlMissing = true
    const { banks } = await seedFinding()
    expect((await leadsOverview()).lists.map((l) => [l.name, l.kind])).toEqual([
      ["Meetup", "static"],
      ["Banks", "static"],
    ])
    expect(await emailsOf({ listId: banks, activity: "seen" })).toEqual(["ravi@icici.test", "asha@hdfc.test"])
    await expect(createLeadList({ admin: ADMIN, name: "Seen", kind: "smart", filter: { activity: "seen" } })).rejects.toMatchObject({ status: 503, message: SMART_LISTS_SQL_MISSING })
    const { id } = await createLeadList({ admin: ADMIN, name: "Shortlist", kind: "static" })
    expect((await bulkLeads({ admin: ADMIN, action: "add", ids: [idOf("dev@globex.test")], listId: id })).affected).toBe(1)
  })
})

describe("one lead", () => {
  it("their details, lists, and every email they were sent with when they saw and clicked it", async () => {
    const { banks } = await seedFinding()
    const detail = await leadDetail(idOf("asha@hdfc.test"))
    expect(detail.lead).toMatchObject({ email: "asha@hdfc.test", name: "Asha Shah", fields: { company: "HDFC Bank", city: "Mumbai" }, unsubscribedAt: null })
    expect(detail.lists).toEqual([{ id: banks, name: "Banks" }])
    expect(detail.emails).toEqual([expect.objectContaining({ status: "sent", campaign: { id: "c1", subject: "Hello banks" }, openedAt: expect.any(Date), clickedAt: expect.any(Date) })])
    expect(detail.columns.map((c) => c.key)).toEqual(["role", "company", "city"])
    expect((await leadDetail(idOf("dev@globex.test"))).emails).toEqual([expect.objectContaining({ status: "failed", error: "Mailbox full" })])
    await expect(leadDetail("gone")).rejects.toMatchObject({ status: 404 })
  })

  it("changing their name and columns; an empty value removes that column", async () => {
    await seedFinding()
    await updateLead(idOf("asha@hdfc.test"), { admin: ADMIN, firstName: " Asha ", lastName: "", name: null, fields: { company: " HDFC ", city: "  ", "not a key!": "x" } })
    expect(leadByEmail("asha@hdfc.test")).toMatchObject({ firstName: "Asha", lastName: null, name: null })
    expect(leadByEmail("asha@hdfc.test").fields).toEqual({ company: "HDFC" })
    expect(store.audit.at(-1)).toMatchObject({ action: "UPDATE_LEAD", details: "asha@hdfc.test" })
    await expect(updateLead("gone", { admin: ADMIN, firstName: null, lastName: null, name: null, fields: {} })).rejects.toMatchObject({ status: 404 })
  })
})

describe("the leads routes", () => {
  const json = (url: string, method: string, body?: unknown) =>
    new Request(`https://carouselabs.test${url}`, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })
  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  it("are for admins only", async () => {
    store.admin = null
    expect((await leadsGet(json("/api/admin/leads", "GET"))).status).toBe(403)
    expect((await bulkPost(json("/api/admin/leads/bulk", "POST", { action: "delete", ids: ["x"] }))).status).toBe(403)
    expect((await listsPost(json("/api/admin/leads/lists", "POST", { name: "x", kind: "static" }))).status).toBe(403)
    expect((await listPatch(json("/api/admin/leads/lists/l1", "PATCH", { name: "x" }), params("l1"))).status).toBe(403)
    expect((await listDelete(json("/api/admin/leads/lists/l1", "DELETE"), params("l1"))).status).toBe(403)
    expect((await leadGet(json("/api/admin/leads/x", "GET"), params("x"))).status).toBe(403)
    expect((await leadPatch(json("/api/admin/leads/x", "PATCH", {}), params("x"))).status).toBe(403)
    expect(store.audit).toEqual([])
  })

  it("the table takes real filters only, and can answer without the lists", async () => {
    await seedFinding()
    expect((await leadsGet(json("/api/admin/leads?filter=nope", "GET"))).status).toBe(400)
    expect((await leadsGet(json(`/api/admin/leads?filter=${encodeURIComponent('{"status":"gone"}')}`, "GET"))).status).toBe(400)
    const only = await (await leadsGet(json(`/api/admin/leads?only=leads&filter=${encodeURIComponent('{"q":"asha"}')}`, "GET"))).json()
    expect(only.totals).toBeUndefined()
    expect(only.leads.map((l: { email: string }) => l.email)).toEqual(["asha@hdfc.test"])
    const full = await (await leadsGet(json(`/api/admin/leads?filter=${encodeURIComponent('{"activity":"never"}')}`, "GET"))).json()
    expect(full).toMatchObject({ totals: { total: 4 }, total: 1 })
    expect(full.columns.map((c: { key: string }) => c.key)).toEqual(["role", "company", "city"])
  })

  it("many at once: an action and the leads (ticked, or a filter)", async () => {
    await seedFinding()
    expect((await bulkPost(json("/api/admin/leads/bulk", "POST", { action: "add", newListName: "x" }))).status).toBe(400)
    expect((await bulkPost(json("/api/admin/leads/bulk", "POST", { action: "nuke", ids: ["x"] }))).status).toBe(400)
    const res = await bulkPost(json("/api/admin/leads/bulk", "POST", { action: "add", filter: { activity: "seen" }, newListName: "Seen" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ affected: 2, kept: 0 })
    const wrong = await bulkPost(json("/api/admin/leads/bulk", "POST", { action: "remove", ids: [idOf("dev@globex.test")] }))
    expect(wrong.status).toBe(400)
    expect(await wrong.json()).toEqual({ error: "Which list?" })
  })

  it("lists: make, rename, change the filter, and delete keeping or deleting the leads", async () => {
    const { meetup } = await seedFinding()
    expect((await listsPost(json("/api/admin/leads/lists", "POST", { kind: "static" }))).status).toBe(400)
    expect((await listsPost(json("/api/admin/leads/lists", "POST", { name: "Smart", kind: "smart", filter: { status: "gone" } }))).status).toBe(400)
    const made = await listsPost(json("/api/admin/leads/lists", "POST", { name: "Clicked", kind: "smart", filter: { activity: "clicked" } }))
    expect(made.status).toBe(201)
    const { id } = await made.json()
    expect((await listPatch(json(`/api/admin/leads/lists/${id}`, "PATCH", { name: "Clickers", filter: { activity: "seen" } }), params(id))).status).toBe(200)
    expect(store.lists.find((l) => l.id === id)).toMatchObject({ name: "Clickers", filter: { activity: "seen" } })
    expect((await listPatch(json(`/api/admin/leads/lists/${meetup}`, "PATCH", { filter: { activity: "seen" } }), params(meetup))).status).toBe(400)
    expect(await (await listDelete(json(`/api/admin/leads/lists/${meetup}?leads=keep`, "DELETE"), params(meetup))).json()).toEqual({ removed: 0 })
    expect(store.leads).toHaveLength(4)
    expect((await listDelete(json(`/api/admin/leads/lists/${meetup}`, "DELETE"), params(meetup))).status).toBe(404)
  })

  it("one lead: read it, and change it with real column keys only", async () => {
    await seedFinding()
    const id = idOf("asha@hdfc.test")
    const got = await (await leadGet(json(`/api/admin/leads/${id}`, "GET"), params(id))).json()
    expect(got.lead.email).toBe("asha@hdfc.test")
    expect((await leadGet(json("/api/admin/leads/gone", "GET"), params("gone"))).status).toBe(404)
    const body = { firstName: "Asha", lastName: null, name: null, fields: { company: "HDFC" } }
    expect((await leadPatch(json(`/api/admin/leads/${id}`, "PATCH", { ...body, fields: { "bad key": "x" } }), params(id))).status).toBe(400)
    expect((await leadPatch(json(`/api/admin/leads/${id}`, "PATCH", body), params(id))).status).toBe(200)
    expect(leadByEmail("asha@hdfc.test").fields).toEqual({ company: "HDFC" })
  })
})

// ── Ready-made emails (lib/readyEmails.ts) ───────────────────────────────

describe("ready-made emails", () => {
  beforeEach(() => {
    viaResend.length = 0
    viaBrevo.length = 0
  })
  const post = (body: unknown) =>
    campaignsPost(new Request("https://carouselabs.test/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }))

  it("are the approved emails word for word, with each person's first name and the reply link still to fill in", () => {
    const [one, two] = READY_EMAILS
    expect(READY_EMAILS.map((e) => [e.id, e.subject, e.fromName])).toEqual([
      ["dharma-1", "App registrations in your Entra tenant", "Dharma Ramasamy"],
      ["dharma-2", "Quick question about your Entra tenant", "Dharma Ramasamy"],
    ])
    const html = readyEmailHtml(one)
    for (const words of [
      "Hello {{firstName}},",
      "Do you know how many app registrations in your Entra tenant still have secrets valid for over a year — including apps nobody owns anymore?",
      "Application.Read.All</code>:",
      "Get-MgApplication -All | Where { $_.PasswordCredentials.EndDateTime -gt (Get-Date).AddYears(1) } | Measure-Object",
      "Would a quick 20-minute conversation be useful?",
      `Identity Security &amp; <span style="white-space:nowrap">SSO Specialist</span>`,
      `<span style="white-space:nowrap">26 Years of Experience</span> &middot; <span style="white-space:nowrap">Microsoft Entra ID</span>`,
      'href="https://www.linkedin.com/in/dharma-ramasamy/"',
      'href="https://dharmaramasamy.com"',
      "Professional experience",
      "Worth a quick chat?",
      `href="${REPLY_LINK}"`,
    ])
      expect(html).toContain(words)
    expect(html).not.toContain("[phone]")
    expect(readyEmailHtml(two)).toContain("I run fixed-scope assessments on exactly that — inventory, ownership, permission scope, credential age, and a prioritised fix list.")
    // Every picture from the live site: nothing embedded, which Gmail wouldn't show.
    const pictures = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])
    expect(pictures).toHaveLength(8)
    expect(pictures.every((src) => /^https:\/\/[^/]+\/images\/email\/dharma\/[\w-]+\.(png|gif)$/.test(src))).toBe(true)
    expect(html).not.toContain("data:")
    expect(readyEmailText(two)).toBe(
      [
        "Hello {{firstName}},",
        "Quick question about your Entra tenant.",
        "If you asked your team today how many app registrations exist and who owns each one, how long would it take them to come back with an answer?",
        "In most environments that question takes weeks, because nobody has looked since the apps were created. Meanwhile the secrets keep working and the permissions never change.",
        "I run fixed-scope assessments on exactly that — inventory, ownership, permission scope, credential age, and a prioritised fix list.",
        "Worth 20 minutes?",
        "Dharma Ramasamy",
      ].join("\n\n"),
    )
  })

  it("the button replies to where replies go (or the sender), with the subject; the preview shows an example name", () => {
    const ready = readySnapshot(READY_EMAILS[0])
    expect(readyHtml(ready, "CarouseLabs <support@carouselabs.com>", null)).toContain('href="mailto:support@carouselabs.com?subject=Re%3A%20App%20registrations%20in%20your%20Entra%20tenant"')
    expect(readyHtml(ready, "CarouseLabs <support@carouselabs.com>", "team@carouselabs.com")).toContain('href="mailto:team@carouselabs.com?subject=')
    expect(readyHtml(ready, "x <support@carouselabs.com>", null)).not.toContain(REPLY_LINK)
    expect(readyFrom(ready, "CarouseLabs <hello@carouselabs.com>")).toBe("Dharma Ramasamy <hello@carouselabs.com>")
    expect(personalizePreview(ready.html, "Priya <3")).toContain("Hello Priya &lt;3,")
    expect(readyDesignOf(ready)).toEqual(ready)
    expect(readyDesignOf({ version: 1, subject: "An AI email" })).toBeNull()
  })

  it("a campaign is made from one by its id, keeping a copy of the email; an unknown one is refused", async () => {
    const { listId } = await importLeads({ adminEmail: ADMIN, listName: "Entra", columns: [], leads: [lead("asha@example.test", { firstName: "Asha" })] })
    const counted = await post({ readyEmail: "dharma-1", recipients: `leads:list:${listId}`, dryRun: true })
    expect(await counted.json()).toMatchObject({ dryRun: true, count: 1 })
    expect(store.campaigns).toHaveLength(0)

    const made = await post({ readyEmail: "dharma-1", recipients: `leads:list:${listId}` })
    expect(made.status).toBe(201)
    const campaign = store.campaigns[0]
    expect(campaign.subject).toBe("App registrations in your Entra tenant")
    expect(campaign.body).toBe(readyEmailText(READY_EMAILS[0]))
    expect(campaign.design).toEqual(readySnapshot(READY_EMAILS[0]))
    expect(store.audit.at(-1)?.details).toContain("· ready-made email")

    const unknown = await post({ readyEmail: "nope", recipients: `leads:list:${listId}` })
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual({ error: "That ready-made email isn't there any more" })
  })

  it("goes out as it is: each lead's first name, from its own name, the button replying, tracked, with an Unsubscribe link", async () => {
    const { listId } = await importLeads({
      adminEmail: ADMIN,
      listName: "Entra",
      columns: [],
      leads: [lead("asha@example.test", { firstName: "Asha" }), lead("kiran@example.test")],
    })
    await post({ readyEmail: "dharma-2", recipients: `leads:list:${listId}` })
    const campaignId = store.campaigns[0].id
    const ids = store.recipients.map((r) => r.id)

    const result = await sendCampaignBatch({ campaignId, recipientIds: ids, adminEmail: ADMIN, resend, brevo, from: "CarouseLabs <support@carouselabs.com>" })

    expect(result).toMatchObject({ sent: 2, failed: 0 })
    expect(viaResend).toEqual([])
    const [asha, kiran] = viaBrevo.flat()
    expect([asha.to, asha.from, asha.subject]).toEqual(["asha@example.test", "Dharma Ramasamy <support@carouselabs.com>", "Quick question about your Entra tenant"])
    expect(asha.html).toContain("Hello Asha,")
    expect(kiran.html).toContain("Hello there,")
    for (const html of [asha.html, kiran.html]) {
      expect(html).not.toContain("{{")
      expect(html).not.toContain(REPLY_LINK)
    }
    expect(asha.html).toContain('href="mailto:support@carouselabs.com?subject=Re%3A%20Quick%20question%20about%20your%20Entra%20tenant"')
    // LinkedIn clicks are counted; the website link goes straight there.
    expect(asha.html).toMatch(/href="[^"]*email-track\/click\/[^"]+\?to=https%3A%2F%2Fwww\.linkedin\.com%2Fin%2Fdharma-ramasamy%2F"/)
    expect(asha.html).toContain('href="https://dharmaramasamy.com"')
    expect(readTrackingToken(/email-track\/open\/([^"]+)"/.exec(asha.html)![1])).toEqual({ kind: "campaign", id: ids[0] })
    const link = unsubscribeUrl(unsubscribeToken(leadByEmail("asha@example.test").id)!)
    expect(asha.html).toContain(link)
    expect(asha.headers).toEqual({ "List-Unsubscribe": `<${link}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" })
    expect(store.recipients.map((r) => r.status)).toEqual(["sent", "sent"])
  })

  it("a typed-in address gets it through Resend, greeted as there, with no Unsubscribe link", async () => {
    await post({ readyEmail: "dharma-1", recipients: ["me@example.test"] })
    const result = await sendCampaignBatch({ campaignId: store.campaigns[0].id, recipientIds: [store.recipients[0].id], adminEmail: ADMIN, resend, brevo, from: "CarouseLabs <support@carouselabs.com>" })
    expect(result.sent).toBe(1)
    const [mine] = viaResend.flat()
    expect([mine.to, mine.from]).toEqual(["me@example.test", "Dharma Ramasamy <support@carouselabs.com>"])
    expect(mine.html).toContain("Hello there,")
    expect(mine.html).not.toContain("Unsubscribe")
  })

  it("used again, a ready-made campaign comes back as the same ready-made email; on its own it can be sent but isn't a template", async () => {
    await post({ readyEmail: "dharma-1", recipients: ["me@example.test"] })
    expect(await emailContent({ kind: "campaign", id: store.campaigns[0].id })).toMatchObject({ design: null, readyEmail: "dharma-1", subject: "App registrations in your Entra tenant", mentionsName: null })
    expect(parseSource("ready:dharma-2")).toEqual({ kind: "ready", id: "dharma-2" })
    expect(await emailContent({ kind: "ready", id: "dharma-2" })).toMatchObject({ readyEmail: "dharma-2", subject: "Quick question about your Entra tenant", design: null })
    expect(await emailContent({ kind: "ready", id: "nope" })).toBeNull()
    await expect(saveTemplate({ source: { kind: "ready", id: "dharma-1" }, name: "x", adminEmail: ADMIN })).rejects.toBeInstanceOf(TemplateError)
  })
})
