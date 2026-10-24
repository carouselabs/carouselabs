// lib/leads.ts
// Leads (Admin → Broadcasts → Leads): saving the people an admin uploads from
// a CSV or adds by hand, finding them (lib/leadFilters.ts), static and smart
// lists, the lead audiences campaigns go to, and what each lead's copy of an
// email needs (their merge fields, an Unsubscribe link). Reading the file and
// the pure rules are in lib/leadRules.ts. Until scripts/leads.sql has been
// run the tables aren't there: the Leads page says so, and campaigns send
// exactly as before.
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import {
  FIELD_KEY_RE,
  cleanEmail,
  leadValues,
  parseLeadAudience,
  type LeadAudience,
  type LeadColumn,
  type LeadInput,
} from "@/lib/leadRules"
import {
  NO_ENGAGEMENT,
  describeFilter,
  isEmptyFilter,
  leadFilterSchema,
  matchesInMemory,
  type Engagement,
  type LeadFilter,
} from "@/lib/leadFilters"

export class LeadsError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
  }
}

export const LEADS_SQL_MISSING = "Run scripts/leads.sql in Supabase first: what leads need in the database isn't there yet."

// The tables aren't there yet (scripts/leads.sql not run).
export const leadsTableMissing = isEngageSchemaMissing

/** What a route answers for a leads error (or the tables not being there yet), or null for any other error. */
export function leadsProblem(err: unknown): { message: string; status: number } | null {
  if (err instanceof LeadsError) return { message: err.message, status: err.status }
  if (leadsTableMissing(err)) return { message: LEADS_SQL_MISSING, status: 503 }
  return null
}

function columnsOf(stored: unknown): LeadColumn[] {
  if (!Array.isArray(stored)) return []
  return stored.flatMap((c) =>
    c && typeof c === "object" && typeof c.key === "string" && FIELD_KEY_RE.test(c.key) ? [{ key: c.key, label: typeof c.label === "string" ? c.label : c.key }] : [],
  )
}

const fieldsOf = (stored: unknown): Record<string, string> =>
  stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as Record<string, string>) : {}

/** Accounts with these addresses (any case): they use CarouseLabs, so they aren't leads. */
async function userEmails(emails: string[]): Promise<Set<string>> {
  if (emails.length === 0) return new Set()
  const users = await db.user.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { email: true } })
  return new Set(users.map((u) => u.email.toLowerCase()))
}

export type ImportResult = {
  listId: string
  // New leads, and ones already saved (from an earlier file) now on this list too.
  added: number
  alreadySaved: number
  // Skipped: they have a CarouseLabs account.
  alreadyUsers: number
  // On the list, but they unsubscribed before, so they won't be emailed.
  unsubscribed: number
  invalid: number
}

/**
 * Saves one part of an upload (the screen sends LEAD_IMPORT_CHUNK rows at a
 * time). The first part creates the list; the rest pass its listId. A lead
 * already saved keeps one row: new columns are added to it, and a name it
 * didn't have is filled in.
 */
export async function importLeads(input: {
  adminEmail: string
  listId?: string
  listName: string
  fileName?: string | null
  columns: LeadColumn[]
  leads: LeadInput[]
}): Promise<ImportResult> {
  // Checked again here: the browser read the file, but the server decides.
  const byEmail = new Map<string, LeadInput>()
  let invalid = 0
  for (const lead of input.leads) {
    const email = cleanEmail(lead.email)
    if (!email) invalid++
    else if (!byEmail.has(email)) byEmail.set(email, { ...lead, email })
  }
  const columns = input.columns.filter((c) => FIELD_KEY_RE.test(c.key))

  let listId = input.listId
  if (listId) {
    const list = await findList(listId).catch(() => null)
    if (!list) throw new LeadsError("That list isn't there any more. Upload the file again.", 404)
    if (list.kind === "smart") throw new LeadsError("A smart list fills itself from its filter: pick another list")
    const known = list.columns
    const added = columns.filter((c) => !known.some((k) => k.key === c.key))
    if (added.length) await db.leadList.update({ where: { id: listId }, data: { columns: [...known, ...added] } })
  } else {
    const list = await db.leadList.create({
      data: { name: input.listName, fileName: input.fileName ?? null, columns, createdBy: input.adminEmail },
      select: { id: true },
    })
    listId = list.id
  }

  const users = await userEmails([...byEmail.keys()])
  const leads = [...byEmail.values()].filter((l) => !users.has(l.email))
  const emails = leads.map((l) => l.email)

  const existing = emails.length
    ? await db.lead.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, firstName: true, lastName: true, name: true, fields: true } })
    : []
  const existingBy = new Map(existing.map((l) => [l.email, l]))
  const fresh = leads.filter((l) => !existingBy.has(l.email))
  if (fresh.length) {
    // skipDuplicates: the same address arriving from another upload meanwhile is kept once.
    await db.lead.createMany({
      data: fresh.map((l) => ({ email: l.email, firstName: l.firstName, lastName: l.lastName, name: l.name, fields: l.fields })),
      skipDuplicates: true,
    })
  }

  // Fill in what an earlier file didn't have; never blank what it did.
  const updates: Prisma.PrismaPromise<unknown>[] = []
  for (const lead of leads) {
    const before = existingBy.get(lead.email)
    if (!before) continue
    const fields = { ...fieldsOf(before.fields), ...lead.fields }
    const data = {
      firstName: lead.firstName ?? before.firstName,
      lastName: lead.lastName ?? before.lastName,
      name: lead.name ?? before.name,
      fields,
    }
    const changed =
      data.firstName !== before.firstName ||
      data.lastName !== before.lastName ||
      data.name !== before.name ||
      JSON.stringify(fields) !== JSON.stringify(fieldsOf(before.fields))
    if (changed) updates.push(db.lead.update({ where: { id: before.id }, data }))
  }
  if (updates.length) await db.$transaction(updates)

  const saved = emails.length ? await db.lead.findMany({ where: { email: { in: emails } }, select: { id: true, unsubscribedAt: true } }) : []
  if (saved.length) {
    await db.leadListMember.createMany({ data: saved.map((l) => ({ listId: listId!, leadId: l.id })), skipDuplicates: true })
  }

  const result: ImportResult = {
    listId,
    added: fresh.length,
    alreadySaved: leads.length - fresh.length,
    alreadyUsers: byEmail.size - leads.length,
    unsubscribed: saved.filter((l) => l.unsubscribedAt).length,
    invalid,
  }
  await logAdminAction({
    adminEmail: input.adminEmail,
    action: "IMPORT_LEADS",
    details: `"${input.listName}": ${result.added} new leads, ${result.alreadySaved} already saved, ${result.alreadyUsers} skipped (CarouseLabs users), ${invalid} bad addresses`,
  })
  return result
}

// ── Lists: static (the people put on it) and smart (a saved filter) ─────

export type ListKind = "static" | "smart"
export type LeadListRow = {
  id: string
  name: string
  fileName: string | null
  columns: LeadColumn[]
  createdBy: string
  createdAt: Date
  kind: ListKind
  filter: LeadFilter | null
  members: number
}

const parseFilter = (stored: unknown): LeadFilter | null => {
  const parsed = leadFilterSchema.safeParse(stored)
  return parsed.success ? parsed.data : null
}

const LIST_FIELDS = { id: true, name: true, fileName: true, columns: true, createdBy: true, createdAt: true, _count: { select: { members: true } } } as const

/** Lists, newest first; all static before scripts/lead-lists.sql is run. */
async function loadLists(where: Prisma.LeadListWhereInput = {}): Promise<LeadListRow[]> {
  type Row = { id: string; name: string; fileName: string | null; columns: unknown; createdBy: string; createdAt: Date; _count: { members: number }; kind?: string; filter?: unknown }
  let rows: Row[]
  try {
    rows = await db.leadList.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, select: { ...LIST_FIELDS, kind: true, filter: true } })
  } catch (err) {
    if (!leadsTableMissing(err)) throw err
    rows = await db.leadList.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, select: LIST_FIELDS })
  }
  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    fileName: l.fileName,
    columns: columnsOf(l.columns),
    createdBy: l.createdBy,
    createdAt: l.createdAt,
    kind: l.kind === "smart" ? "smart" : "static",
    filter: l.kind === "smart" ? parseFilter(l.filter) : null,
    members: l._count.members,
  }))
}

async function findList(id: string): Promise<LeadListRow> {
  const [list] = await loadLists({ id })
  if (!list) throw new LeadsError("That list isn't there any more", 404)
  return list
}

// ── Finding leads (lib/leadFilters.ts) ──────────────────────────────────

const LEAD_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  name: true,
  fields: true,
  createdAt: true,
  lastEmailedAt: true,
  emailCount: true,
  unsubscribedAt: true,
} as const
type LeadRow = Prisma.LeadGetPayload<{ select: typeof LEAD_FIELDS }> & { stopReason: string | null }

// The leads a query finds, with why they stopped once leads.sql's Brevo part is run.
async function leadRows(args: { where: Prisma.LeadWhereInput; skip?: number; take?: number }): Promise<LeadRow[]> {
  const query = { ...args, orderBy: [{ createdAt: "desc" as const }, { email: "asc" as const }] }
  try {
    return await db.lead.findMany({ ...query, select: { ...LEAD_FIELDS, stopReason: true } })
  } catch (err) {
    if (!leadsTableMissing(err)) throw err
    return (await db.lead.findMany({ ...query, select: LEAD_FIELDS })).map((l) => ({ ...l, stopReason: null }))
  }
}

/** What each address did with the campaign emails it was sent (people only: lib/emailScanners.ts). */
export async function engagementByEmail(emails: string[]): Promise<Map<string, Engagement>> {
  const map = new Map<string, Engagement>()
  const unique = [...new Set(emails.map((e) => e.toLowerCase()))]
  for (let i = 0; i < unique.length; i += 5000) {
    const groups = await db.emailCampaignRecipient.groupBy({
      by: ["email"],
      where: { email: { in: unique.slice(i, i + 5000) }, status: "sent" },
      _count: { _all: true },
      _max: { sentAt: true, openedAt: true, clickedAt: true },
    })
    for (const g of groups) {
      map.set(g.email.toLowerCase(), { emails: g._count._all, lastSentAt: g._max.sentAt, lastSeenAt: g._max.openedAt, lastClickedAt: g._max.clickedAt })
    }
  }
  return map
}

// A smart list's people are its filter's, plus whatever else is asked now.
async function resolveFilter(filter: LeadFilter): Promise<{ filter: LeadFilter; staticListId: string | null }> {
  if (!filter.listId) return { filter, staticListId: null }
  const list = await findList(filter.listId)
  if (list.kind === "static") return { filter, staticListId: list.id }
  const rest: LeadFilter = { ...filter }
  delete rest.listId
  const merged: LeadFilter = { ...(list.filter ?? {}), ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) }
  return { filter: merged, staticListId: merged.listId ?? null }
}

function whereOf(f: LeadFilter, staticListId: string | null, now: Date): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = []
  if (staticListId) and.push({ lists: { some: { listId: staticListId } } })
  if (f.status === "active") and.push({ unsubscribedAt: null })
  if (f.status === "stopped") and.push({ unsubscribedAt: { not: null } })
  if (f.status === "unsubscribed") and.push({ unsubscribedAt: { not: null }, OR: [{ stopReason: null }, { stopReason: "unsubscribed" }] })
  if (f.status === "bounced") and.push({ unsubscribedAt: { not: null }, stopReason: { in: ["bounced", "blocked"] } })
  if (f.status === "spam") and.push({ unsubscribedAt: { not: null }, stopReason: "spam" })
  if (f.addedDays) and.push({ createdAt: { gte: new Date(now.getTime() - f.addedDays * 86_400_000) } })
  if (f.q) {
    const q = f.q.trim()
    and.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    })
  }
  return and.length ? { AND: and } : {}
}

/** Every lead a filter finds (a smart list's filter included), newest first. */
export async function matchingLeads(filter: LeadFilter, now: Date = new Date()): Promise<LeadRow[]> {
  const { filter: f, staticListId } = await resolveFilter(filter)
  const rows = await leadRows({ where: whereOf(f, staticListId, now) })
  if (!f.field && !f.activity) return rows
  const engagement = f.activity ? await engagementByEmail(rows.map((r) => r.email)) : new Map<string, Engagement>()
  return rows.filter((r) => matchesInMemory(r, engagement.get(r.email) ?? NO_ENGAGEMENT, f, now))
}

/** The page's numbers and every list (a smart list's count is whoever matches it now), newest first. */
export async function leadsOverview() {
  const lists = await loadLists()
  const total = await db.lead.count()
  const unsubscribed = await db.lead.count({ where: { unsubscribedAt: { not: null } } })
  const neverEmailed = await db.lead.count({ where: { unsubscribedAt: null, lastEmailedAt: null } })
  const counted = []
  for (const l of lists) {
    counted.push({
      id: l.id,
      name: l.name,
      fileName: l.fileName,
      columns: l.kind === "smart" ? [] : l.columns,
      createdBy: l.createdBy,
      createdAt: l.createdAt,
      kind: l.kind,
      filter: l.filter,
      count: l.kind === "smart" ? (l.filter ? (await matchingLeads(l.filter)).length : 0) : l.members,
    })
  }
  // Every column any lead has: for the column filter and the table.
  const columns = new Map<string, LeadColumn>()
  for (const l of lists) for (const c of l.columns) if (!columns.has(c.key)) columns.set(c.key, c)
  return { totals: { total, unsubscribed, neverEmailed }, lists: counted, columns: [...columns.values()] }
}

export const LEADS_PAGE_SIZE = 50

/** One page of the leads a filter finds, newest first, with their lists and what they did with the emails. */
export async function listLeads(input: { filter: LeadFilter; page?: number }) {
  const now = new Date()
  const page = Math.max(1, Math.floor(input.page ?? 1))
  const { filter: f, staticListId } = await resolveFilter(input.filter)
  let rows: LeadRow[]
  let total: number
  if (!f.field && !f.activity) {
    // All in the database: just this page.
    const where = whereOf(f, staticListId, now)
    rows = await leadRows({ where, skip: (page - 1) * LEADS_PAGE_SIZE, take: LEADS_PAGE_SIZE })
    total = await db.lead.count({ where })
  } else {
    const all = await matchingLeads(input.filter, now)
    total = all.length
    rows = all.slice((page - 1) * LEADS_PAGE_SIZE, page * LEADS_PAGE_SIZE)
  }
  const ids = rows.map((r) => r.id)
  const [engagement, memberships] = [
    await engagementByEmail(rows.map((r) => r.email)),
    ids.length ? await db.leadListMember.findMany({ where: { leadId: { in: ids } }, select: { leadId: true, list: { select: { id: true, name: true } } } }) : [],
  ]
  return {
    page,
    pageSize: LEADS_PAGE_SIZE,
    total,
    leads: rows.map((l) => {
      const e = engagement.get(l.email) ?? NO_ENGAGEMENT
      return {
        id: l.id,
        email: l.email,
        name: l.name || [l.firstName, l.lastName].filter(Boolean).join(" ") || null,
        fields: fieldsOf(l.fields),
        lists: memberships.filter((m) => m.leadId === l.id).map((m) => m.list),
        createdAt: l.createdAt,
        lastEmailedAt: l.lastEmailedAt,
        emailCount: Math.max(l.emailCount, e.emails),
        lastSeenAt: e.lastSeenAt,
        lastClickedAt: e.lastClickedAt,
        unsubscribedAt: l.unsubscribedAt,
        stopReason: l.stopReason,
      }
    }),
  }
}

// ── Changing lists and leads ────────────────────────────────────────────

export const SMART_LISTS_SQL_MISSING = "Run scripts/lead-lists.sql in Supabase first: smart lists need it."

/** A new list: static (empty, filled by ticking leads) or smart (a saved filter). */
export async function createLeadList(input: { admin: string; name: string; kind: ListKind; filter?: LeadFilter | null }): Promise<{ id: string }> {
  const name = input.name.trim()
  if (!name) throw new LeadsError("Name the list")
  if (input.kind === "smart") {
    if (!input.filter || isEmptyFilter(input.filter)) throw new LeadsError("Pick at least one filter for a smart list")
    await checkSmartFilter(input.filter)
  }
  let list: { id: string }
  try {
    list = await db.leadList.create({
      data: { name, createdBy: input.admin, ...(input.kind === "smart" ? { kind: "smart", filter: input.filter! } : {}) },
      select: { id: true },
    })
  } catch (err) {
    if (input.kind === "smart" && leadsTableMissing(err)) throw new LeadsError(SMART_LISTS_SQL_MISSING, 503)
    throw err
  }
  await logAdminAction({ adminEmail: input.admin, action: "CREATE_LEAD_LIST", details: `"${name}" (${input.kind === "smart" ? `smart: ${describeFilter(input.filter!)}` : "empty"})` })
  return list
}

// A smart list can build on a static list, not on another smart one.
async function checkSmartFilter(filter: LeadFilter) {
  if (filter.listId && (await findList(filter.listId)).kind === "smart") throw new LeadsError("A smart list can't be built on another smart list")
}

/** Renames a list, or changes a smart list's filter. */
export async function updateLeadList(id: string, input: { admin: string; name?: string; filter?: LeadFilter }) {
  const list = await findList(id)
  const name = input.name?.trim()
  if (input.name !== undefined && !name) throw new LeadsError("Name the list")
  if (input.filter) {
    if (list.kind !== "smart") throw new LeadsError("Only a smart list has a filter")
    if (isEmptyFilter(input.filter)) throw new LeadsError("Pick at least one filter for a smart list")
    if (input.filter.listId === id) throw new LeadsError("A smart list can't be built on itself")
    await checkSmartFilter(input.filter)
  }
  await db.leadList.update({ where: { id }, data: { ...(name ? { name } : {}), ...(input.filter ? { filter: input.filter } : {}) }, select: { id: true } })
  await logAdminAction({
    adminEmail: input.admin,
    action: "UPDATE_LEAD_LIST",
    details: `"${list.name}"${name && name !== list.name ? ` renamed "${name}"` : ""}${input.filter ? `, filter: ${describeFilter(input.filter)}` : ""}`,
  })
}

/**
 * Deletes a list. A smart list has no people of its own. A static list's
 * leads stay unless withLeads: then the ones only on it go, except anyone
 * who unsubscribed (that's what keeps them from being emailed if a later
 * file has them again).
 */
export async function deleteLeadList(id: string, adminEmail: string, { withLeads = true }: { withLeads?: boolean } = {}): Promise<{ removed: number }> {
  const list = await findList(id)
  let removed = 0
  if (list.kind === "static" && withLeads) {
    const onlyHere = await db.lead.findMany({
      where: { unsubscribedAt: null, lists: { some: { listId: id }, every: { listId: id } } },
      select: { id: true },
    })
    if (onlyHere.length) await db.lead.deleteMany({ where: { id: { in: onlyHere.map((l) => l.id) } } })
    removed = onlyHere.length
  }
  await db.leadList.delete({ where: { id } })
  await logAdminAction({
    adminEmail,
    action: "DELETE_LEAD_LIST",
    details: list.kind === "smart" ? `Smart list "${list.name}"` : `"${list.name}"${withLeads ? ` and ${removed} leads only on it` : ", leads kept"}`,
  })
  return { removed }
}

export type BulkAction = "add" | "remove" | "delete"

/**
 * Does one thing to many leads: the ticked ones, or everyone a filter finds.
 * add: onto a static list (or a new one, named here); remove: off a static
 * list; delete: the leads themselves, except anyone who stopped (kept so
 * they're never emailed again).
 */
export async function bulkLeads(input: {
  admin: string
  action: BulkAction
  ids?: string[]
  filter?: LeadFilter
  listId?: string
  newListName?: string
}): Promise<{ affected: number; kept: number; listId?: string }> {
  const ids = input.ids ?? (await matchingLeads(input.filter ?? {})).map((l) => l.id)
  if (ids.length === 0) throw new LeadsError("Pick at least one lead")

  if (input.action === "delete") {
    let deleted = 0
    for (let i = 0; i < ids.length; i += 5000) {
      deleted += (await db.lead.deleteMany({ where: { id: { in: ids.slice(i, i + 5000) }, unsubscribedAt: null } })).count
    }
    await logAdminAction({ adminEmail: input.admin, action: "DELETE_LEADS", details: `${deleted} leads (${ids.length - deleted} kept: they stopped getting emails)` })
    return { affected: deleted, kept: ids.length - deleted }
  }

  let listId = input.listId
  let listName: string
  if (listId) {
    const list = await findList(listId)
    if (list.kind === "smart") throw new LeadsError("A smart list fills itself from its filter: people can't be added or taken off by hand")
    listName = list.name
  } else {
    if (input.action === "remove") throw new LeadsError("Which list?")
    listName = input.newListName?.trim() ?? ""
    if (!listName) throw new LeadsError("Name the new list")
    listId = (await db.leadList.create({ data: { name: listName, createdBy: input.admin }, select: { id: true } })).id
  }

  let affected = 0
  if (input.action === "add") {
    // The list learns the columns its new people have.
    const all = await loadLists()
    const known = new Map(all.flatMap((l) => l.columns).map((c) => [c.key, c]))
    const leads = await db.lead.findMany({ where: { id: { in: ids } }, select: { fields: true } })
    const keys = new Set(leads.flatMap((l) => Object.keys(fieldsOf(l.fields))))
    const list = all.find((l) => l.id === listId)
    const columns = [...(list?.columns ?? [])]
    for (const key of keys) if (!columns.some((c) => c.key === key) && FIELD_KEY_RE.test(key)) columns.push(known.get(key) ?? { key, label: key })
    await db.leadList.update({ where: { id: listId }, data: { columns }, select: { id: true } })
    for (let i = 0; i < ids.length; i += 5000) {
      affected += (await db.leadListMember.createMany({ data: ids.slice(i, i + 5000).map((leadId) => ({ listId: listId!, leadId })), skipDuplicates: true })).count
    }
  } else {
    for (let i = 0; i < ids.length; i += 5000) {
      affected += (await db.leadListMember.deleteMany({ where: { listId, leadId: { in: ids.slice(i, i + 5000) } } })).count
    }
  }
  await logAdminAction({
    adminEmail: input.admin,
    action: input.action === "add" ? "ADD_TO_LEAD_LIST" : "REMOVE_FROM_LEAD_LIST",
    details: `${affected} leads ${input.action === "add" ? "onto" : "off"} "${listName}"`,
  })
  return { affected, kept: 0, listId }
}

/** One lead: their details, lists, every email they were sent (seen and clicked), and the columns there are. */
export async function leadDetail(id: string) {
  const [lead] = await leadRows({ where: { id } })
  if (!lead) throw new LeadsError("That lead isn't there any more", 404)
  const lists = await db.leadListMember.findMany({ where: { leadId: id }, select: { list: { select: { id: true, name: true } } } })
  const where = { email: lead.email }
  const sent = await db.emailCampaignRecipient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      sentAt: true,
      error: true,
      openedAt: true,
      openCount: true,
      clickedAt: true,
      clickCount: true,
      campaign: { select: { id: true, subject: true } },
    },
  })
  // What security scanners did, once scripts/email-scanners.sql is run.
  let scanners = new Map<string, { lastClickedAt: Date | null; scannedAt: Date | null; scanReason: string | null; autoOpenedAt: Date | null }>()
  try {
    const rows = await db.emailCampaignRecipient.findMany({
      where: { id: { in: sent.map((r) => r.id) } },
      select: { id: true, lastClickedAt: true, scannedAt: true, scanReason: true, autoOpenedAt: true },
    })
    scanners = new Map(rows.map(({ id, ...rest }) => [id, rest]))
  } catch (err) {
    if (!leadsTableMissing(err)) throw err
  }
  const emails = sent.map((r) => ({ ...r, ...scanners.get(r.id) }))
  const columns = new Map<string, LeadColumn>()
  for (const l of await loadLists()) for (const c of l.columns) if (!columns.has(c.key)) columns.set(c.key, c)
  return {
    lead: {
      id: lead.id,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      name: lead.name,
      fields: fieldsOf(lead.fields),
      createdAt: lead.createdAt,
      unsubscribedAt: lead.unsubscribedAt,
      stopReason: lead.stopReason,
    },
    lists: lists.map((m) => m.list),
    emails,
    columns: [...columns.values()],
  }
}

/** Changes a lead's name and columns (an empty value removes that column). */
export async function updateLead(
  id: string,
  input: { admin: string; firstName: string | null; lastName: string | null; name: string | null; fields: Record<string, string> },
) {
  const lead = await db.lead.findUnique({ where: { id }, select: { email: true } })
  if (!lead) throw new LeadsError("That lead isn't there any more", 404)
  const clean = (v: string | null) => v?.trim().slice(0, 100) || null
  const fields = Object.fromEntries(
    Object.entries(input.fields).flatMap(([k, v]) => (FIELD_KEY_RE.test(k) && v.trim() ? [[k, v.trim().slice(0, 500)]] : [])),
  )
  await db.lead.update({
    where: { id },
    data: { firstName: clean(input.firstName), lastName: clean(input.lastName), name: clean(input.name), fields },
    select: { id: true },
  })
  await logAdminAction({ adminEmail: input.admin, action: "UPDATE_LEAD", details: `${lead.email}` })
}

// Every column of these lists, once each; null when there are no lists
// (or no tables yet).
async function listColumns(listId?: string | null): Promise<LeadColumn[] | null> {
  try {
    const lists = await db.leadList.findMany({ where: listId ? { id: listId } : {}, select: { columns: true } })
    if (lists.length === 0) return null
    const all = new Map<string, LeadColumn>()
    for (const l of lists) for (const c of columnsOf(l.columns)) if (!all.has(c.key)) all.set(c.key, c)
    return [...all.values()]
  } catch (err) {
    if (leadsTableMissing(err)) return null
    throw err
  }
}

/** The merge fields these leads have beyond their name and email (a list's columns, or every list's: a smart list's people can have any). */
export async function leadFieldKeys(listId?: string | null): Promise<LeadColumn[]> {
  let id = listId ?? null
  if (id) {
    const [list] = await loadLists({ id }).catch((err) => {
      if (leadsTableMissing(err)) return []
      throw err
    })
    if (list?.kind === "smart") id = null
  }
  return (await listColumns(id)) ?? []
}

/** For the AI writer: every lead column, or null when no leads are saved (it's then told nothing about leads). */
export const writerLeadFields = () => listColumns()

/** The list's name, for the campaign to show. */
export async function leadListName(listId: string): Promise<string | null> {
  const list = await db.leadList.findUnique({ where: { id: listId }, select: { name: true } })
  return list?.name ?? null
}

/**
 * Who a lead audience is: leads still subscribed (and, for "new", that no
 * campaign has reached yet), oldest first, leaving out anyone who has since
 * made a CarouseLabs account.
 */
export async function resolveLeadAudience(audience: LeadAudience): Promise<{ userId: null; email: string; name: string | null }[]> {
  const parsed = parseLeadAudience(audience)
  if (!parsed) return []
  const list = parsed.kind === "list" ? await findList(parsed.listId).catch(() => null) : null
  if (parsed.kind === "list" && !list) throw new LeadsError("That leads list isn't there any more", 404)
  const leads =
    list?.kind === "smart"
      ? // Whoever matches its filter now (none if it has lost its filter), oldest first.
        list.filter
        ? (await matchingLeads(list.filter)).filter((l) => !l.unsubscribedAt).reverse()
        : []
      : await db.lead.findMany({
          where: {
            unsubscribedAt: null,
            ...(parsed.kind === "new" ? { lastEmailedAt: null } : {}),
            ...(parsed.kind === "list" ? { lists: { some: { listId: parsed.listId } } } : {}),
          },
          orderBy: [{ createdAt: "asc" }, { email: "asc" }],
          select: { email: true, firstName: true, lastName: true, name: true },
        })
  const users = await userEmails(leads.map((l) => l.email))
  return leads
    .filter((l) => !users.has(l.email))
    .map((l) => ({ userId: null, email: l.email, name: l.name || [l.firstName, l.lastName].filter(Boolean).join(" ") || null }))
}

export type LeadSendInfo = { id: string; values: Record<string, string>; unsubscribed: boolean }

/**
 * The leads among people a campaign is about to email (by address): their
 * merge-field values, and whether they unsubscribed. Empty before
 * scripts/leads.sql has been run, so campaigns send as they always did.
 */
export async function leadSendInfo(emails: string[]): Promise<Map<string, LeadSendInfo>> {
  if (emails.length === 0) return new Map()
  try {
    const leads = await db.lead.findMany({
      where: { email: { in: emails.map((e) => e.toLowerCase()) } },
      select: { id: true, email: true, firstName: true, lastName: true, name: true, fields: true, unsubscribedAt: true },
    })
    return new Map(leads.map((l) => [l.email, { id: l.id, values: leadValues(l), unsubscribed: !!l.unsubscribedAt }]))
  } catch (err) {
    if (leadsTableMissing(err)) return new Map()
    throw err
  }
}

/** A campaign reached these leads. */
export async function markLeadsEmailed(leadIds: string[], at: Date): Promise<void> {
  if (leadIds.length === 0) return
  await db.lead.updateMany({ where: { id: { in: leadIds } }, data: { lastEmailedAt: at, emailCount: { increment: 1 } } })
}

// Why a lead isn't emailed any more: our Unsubscribe link or Brevo's button,
// or Brevo telling us (lib/brevo.ts BREVO_STOP_EVENTS).
export type StopReason = "unsubscribed" | "bounced" | "spam" | "blocked"

// Stops emailing these leads (once: the first reason stays). stopReason needs
// scripts/leads.sql's Brevo part; until it's run they're still stopped, just
// without the reason.
async function stopLeads(where: Prisma.LeadWhereInput, reason: StopReason, at: Date): Promise<number> {
  const target = { ...where, unsubscribedAt: null }
  try {
    return (await db.lead.updateMany({ where: target, data: { unsubscribedAt: at, stopReason: reason } })).count
  } catch (err) {
    if (!leadsTableMissing(err)) throw err
    return (await db.lead.updateMany({ where: target, data: { unsubscribedAt: at } })).count
  }
}

/** They clicked Unsubscribe. Returns false for a lead that isn't there. */
export async function unsubscribeLead(id: string, at: Date = new Date()): Promise<boolean> {
  const lead = await db.lead.findUnique({ where: { id }, select: { id: true } })
  if (!lead) return false
  await stopLeads({ id }, "unsubscribed", at)
  return true
}

/** Brevo stopped this address (lib/brevo.ts): its lead isn't emailed again. Returns how many leads that was (0 or 1). */
export async function stopLeadByEmail(email: string, reason: StopReason, at: Date = new Date()): Promise<number> {
  const clean = cleanEmail(email)
  return clean ? stopLeads({ email: clean }, reason, at) : 0
}
