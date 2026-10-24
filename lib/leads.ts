// lib/leads.ts
// Leads (Admin → Broadcasts → Leads): saving the people an admin uploads from
// a CSV, the lead audiences campaigns go to, and what each lead's copy of an
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

export class LeadsError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
  }
}

export const LEADS_SQL_MISSING = "Run scripts/leads.sql in Supabase first: the leads tables aren't there yet."

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
    const list = await db.leadList.findUnique({ where: { id: listId }, select: { columns: true } })
    if (!list) throw new LeadsError("That list isn't there any more. Upload the file again.", 404)
    const known = columnsOf(list.columns)
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

  const existing = emails.length ? await db.lead.findMany({ where: { email: { in: emails } } }) : []
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

/** The page's numbers and every list, newest first. */
export async function leadsOverview() {
  const lists = await db.leadList.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, fileName: true, columns: true, createdBy: true, createdAt: true, _count: { select: { members: true } } },
  })
  const total = await db.lead.count()
  const unsubscribed = await db.lead.count({ where: { unsubscribedAt: { not: null } } })
  const neverEmailed = await db.lead.count({ where: { unsubscribedAt: null, lastEmailedAt: null } })
  return {
    totals: { total, unsubscribed, neverEmailed },
    lists: lists.map((l) => ({
      id: l.id,
      name: l.name,
      fileName: l.fileName,
      columns: columnsOf(l.columns),
      createdBy: l.createdBy,
      createdAt: l.createdAt,
      count: l._count.members,
    })),
  }
}

export const LEADS_PAGE_SIZE = 50

/** One page of leads, newest first: all of them or one list's, optionally searched. */
export async function listLeads(input: { listId?: string | null; search?: string | null; page?: number }) {
  const search = input.search?.trim()
  const where: Prisma.LeadWhereInput = {
    ...(input.listId ? { lists: { some: { listId: input.listId } } } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }
  const page = Math.max(1, Math.floor(input.page ?? 1))
  const rows = await db.lead.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
    skip: (page - 1) * LEADS_PAGE_SIZE,
    take: LEADS_PAGE_SIZE,
    include: { lists: { select: { list: { select: { id: true, name: true } } } } },
  })
  const total = await db.lead.count({ where })
  return {
    page,
    pageSize: LEADS_PAGE_SIZE,
    total,
    leads: rows.map((l) => ({
      id: l.id,
      email: l.email,
      name: l.name || [l.firstName, l.lastName].filter(Boolean).join(" ") || null,
      fields: fieldsOf(l.fields),
      lists: l.lists.map((m) => m.list),
      createdAt: l.createdAt,
      lastEmailedAt: l.lastEmailedAt,
      emailCount: l.emailCount,
      unsubscribedAt: l.unsubscribedAt,
    })),
  }
}

/**
 * Deletes a list, and the leads that were only on it. Leads on another list
 * stay, and so does anyone who unsubscribed: that's what keeps them from
 * being emailed if a later file has them again.
 */
export async function deleteLeadList(id: string, adminEmail: string): Promise<{ removed: number }> {
  const list = await db.leadList.findUnique({ where: { id }, select: { name: true } })
  if (!list) throw new LeadsError("That list isn't there any more", 404)
  const onlyHere = await db.lead.findMany({
    where: { unsubscribedAt: null, lists: { some: { listId: id }, every: { listId: id } } },
    select: { id: true },
  })
  if (onlyHere.length) await db.lead.deleteMany({ where: { id: { in: onlyHere.map((l) => l.id) } } })
  await db.leadList.delete({ where: { id } })
  await logAdminAction({ adminEmail, action: "DELETE_LEAD_LIST", details: `"${list.name}" and ${onlyHere.length} leads only on it` })
  return { removed: onlyHere.length }
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

/** The merge fields these leads have beyond their name and email (a list's columns, or every list's). */
export async function leadFieldKeys(listId?: string | null): Promise<LeadColumn[]> {
  return (await listColumns(listId)) ?? []
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
  if (parsed.kind === "list" && !(await db.leadList.findUnique({ where: { id: parsed.listId }, select: { id: true } }))) {
    throw new LeadsError("That leads list isn't there any more", 404)
  }
  const leads = await db.lead.findMany({
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
    const leads = await db.lead.findMany({ where: { email: { in: emails.map((e) => e.toLowerCase()) } } })
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

/** They clicked Unsubscribe. Returns false for a lead that isn't there. */
export async function unsubscribeLead(id: string, at: Date = new Date()): Promise<boolean> {
  const lead = await db.lead.findUnique({ where: { id }, select: { unsubscribedAt: true } })
  if (!lead) return false
  if (!lead.unsubscribedAt) await db.lead.update({ where: { id }, data: { unsubscribedAt: at } })
  return true
}
