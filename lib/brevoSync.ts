// lib/brevoSync.ts — "Sync from Brevo" on the Leads page: copies a lead
// account's Brevo contacts (lib/leadAccounts.ts; Anant Goyal's anantgoyal.in
// account) into its leads. Each Brevo list becomes a lead list of the same
// name (found again by its Brevo id, so syncing again fills the same list),
// and "All contacts" copies everyone. Contacts come a page at a time (the
// screen asks for the next page until it's done), go through the same import
// as an upload (lib/leads.ts importLeads: one lead per address, names filled
// in, never blanked), and anyone Brevo has blocklisted or unsubscribed from
// the list is stopped here too, so they're never emailed. Read-only on
// Brevo's side: nothing there is changed.
import { brevoGet, brevoKey, brevoMissing } from "@/lib/brevo"
import { db } from "@/lib/db"
import { ACCOUNTS, type LeadAccount } from "@/lib/leadAccounts"
import { FIELD_KEY_RE, cleanEmail, fieldKey, type LeadColumn, type LeadInput } from "@/lib/leadRules"
import { LeadsError, importLeads, listForBrevo, stopLeadsByEmail, type ImportResult } from "@/lib/leads"

// "All contacts" isn't a Brevo list: it's kept as Brevo list 0.
export const ALL_CONTACTS = 0
export const ALL_CONTACTS_NAME = "All Brevo contacts"
// Contacts per request (Brevo allows up to 500 for a list's contacts).
export const BREVO_SYNC_PAGE = 500

// Brevo's contact attributes that aren't merge fields: its own guesses and
// settings, and phone numbers (not needed to email anyone).
const SKIP_ATTRIBUTES = new Set(["OPT_IN", "CONTACT_TIMEZONE", "EXT_ID", "SMS", "WHATSAPP", "LANDLINE_NUMBER", "DOUBLE_OPT-IN"])
const FIRST = new Set(["FIRSTNAME", "FIRST_NAME", "PRENOM", "VORNAME", "NOMBRE"])
const LAST = new Set(["LASTNAME", "LAST_NAME", "NOM", "NACHNAME", "APELLIDOS", "SURNAME"])

export type BrevoContact = {
  email?: string
  emailBlacklisted?: boolean
  listUnsubscribed?: number[]
  attributes?: Record<string, unknown>
}

/** One Brevo contact as a lead: first and last name, the other attributes as merge fields ({{jobTitle}}). */
export function contactToLead(contact: BrevoContact): LeadInput | null {
  const email = cleanEmail(contact.email)
  if (!email) return null
  const lead: LeadInput = { email, firstName: null, lastName: null, name: null, fields: {} }
  for (const [name, raw] of Object.entries(contact.attributes ?? {})) {
    const upper = name.toUpperCase()
    if (upper.startsWith("_") || SKIP_ATTRIBUTES.has(upper) || raw === null || raw === undefined || typeof raw === "object") continue
    const value = String(raw).trim()
    if (!value) continue
    if (FIRST.has(upper)) lead.firstName = value.slice(0, 100)
    else if (LAST.has(upper)) lead.lastName = value.slice(0, 100)
    else {
      const key = fieldKey(name)
      if (FIELD_KEY_RE.test(key) && !["email", "firstName", "lastName", "name"].includes(key)) lead.fields[key] = value.slice(0, 500)
    }
  }
  return lead
}

/** The columns these leads have beyond their name and email, labelled like Brevo names them. */
export function columnsOf(contacts: BrevoContact[]): LeadColumn[] {
  const columns = new Map<string, LeadColumn>()
  for (const c of contacts) {
    for (const name of Object.keys(c.attributes ?? {})) {
      const lead = contactToLead({ email: "x@y.zz", attributes: { [name]: (c.attributes ?? {})[name] } })
      for (const key of Object.keys(lead?.fields ?? {})) if (!columns.has(key)) columns.set(key, { key, label: name })
    }
  }
  return [...columns.values()]
}

/** Whether Brevo says not to email them: blocklisted, or unsubscribed from this list. */
export const stoppedInBrevo = (contact: BrevoContact, brevoListId: number) =>
  !!contact.emailBlacklisted || (brevoListId !== ALL_CONTACTS && (contact.listUnsubscribed ?? []).includes(brevoListId))

function keyFor(account: LeadAccount): string {
  const key = brevoKey(account)
  if (!key) throw new LeadsError(brevoMissing(account), 503)
  return key
}

// Brevo's refusal, as the Leads page shows it.
async function ask<T>(path: string, key: string, fetchFn: typeof fetch): Promise<T> {
  try {
    return await brevoGet<T>(path, key, fetchFn)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brevo didn't answer"
    throw new LeadsError(
      /\bIP address/i.test(message)
        ? "Brevo only takes calls from IP addresses you approved, and this website's servers change address. In Brevo → Security → Authorised IPs, turn off IP blocking."
        : `Brevo: ${message}`,
      502,
    )
  }
}

export type BrevoListInfo = {
  brevoListId: number
  name: string
  // How many contacts Brevo has on it (subscribed), and blocklisted.
  contacts: number
  blocklisted: number
  // The lead list it was copied into, once synced.
  synced: { listId: string; name: string; members: number } | null
}

/** The account's Brevo lists (and "All contacts"), with the lead list each was copied into. */
export async function brevoLists(account: LeadAccount, fetchFn: typeof fetch = fetch): Promise<BrevoListInfo[]> {
  const key = keyFor(account)
  type ListsAnswer = { count?: number; lists?: { id: number; name: string; uniqueSubscribers?: number; totalSubscribers?: number; totalBlacklisted?: number }[] }
  const lists: NonNullable<ListsAnswer["lists"]> = []
  for (let offset = 0; offset < 5000; offset += 50) {
    const page = await ask<ListsAnswer>(`/contacts/lists?limit=50&offset=${offset}`, key, fetchFn)
    lists.push(...(page.lists ?? []))
    if ((page.lists ?? []).length < 50 || lists.length >= (page.count ?? 0)) break
  }
  const all = await ask<{ count?: number }>("/contacts?limit=1&offset=0", key, fetchFn)
  const copied = await db.leadList.findMany({
    where: { account, brevoListId: { not: null } },
    select: { id: true, name: true, brevoListId: true, _count: { select: { members: true } } },
  })
  const copyOf = (id: number) => {
    const c = copied.find((l) => l.brevoListId === id)
    return c ? { listId: c.id, name: c.name, members: c._count.members } : null
  }
  return [
    { brevoListId: ALL_CONTACTS, name: ALL_CONTACTS_NAME, contacts: all.count ?? 0, blocklisted: 0, synced: copyOf(ALL_CONTACTS) },
    ...lists.map((l) => ({
      brevoListId: l.id,
      name: l.name,
      contacts: l.uniqueSubscribers ?? l.totalSubscribers ?? 0,
      blocklisted: l.totalBlacklisted ?? 0,
      synced: copyOf(l.id),
    })),
  ]
}

export type SyncPage = ImportResult & {
  listName: string
  // Contacts Brevo says not to email, stopped here too.
  stopped: number
  // Where the next page starts, or null when this was the last.
  nextOffset: number | null
  // How many contacts the Brevo list has.
  total: number
}

/** Copies one page of a Brevo list's contacts (from `offset`) into its lead list. */
export async function syncBrevoPage(input: { account: LeadAccount; brevoListId: number; offset: number; admin: string; fetchFn?: typeof fetch }): Promise<SyncPage> {
  const fetchFn = input.fetchFn ?? fetch
  const key = keyFor(input.account)
  const offset = Math.max(0, Math.floor(input.offset))

  let name = ALL_CONTACTS_NAME
  if (input.brevoListId !== ALL_CONTACTS) {
    const list = await ask<{ name?: string }>(`/contacts/lists/${input.brevoListId}`, key, fetchFn)
    name = list.name?.trim() || `Brevo list ${input.brevoListId}`
  }
  const path =
    input.brevoListId === ALL_CONTACTS
      ? `/contacts?limit=${BREVO_SYNC_PAGE}&offset=${offset}&sort=asc`
      : `/contacts/lists/${input.brevoListId}/contacts?limit=${BREVO_SYNC_PAGE}&offset=${offset}&sort=asc`
  const page = await ask<{ contacts?: BrevoContact[]; count?: number }>(path, key, fetchFn)
  const contacts = page.contacts ?? []
  const total = page.count ?? offset + contacts.length

  const list = await listForBrevo({ account: input.account, brevoListId: input.brevoListId, name, admin: input.admin })
  const leads = contacts.flatMap((c) => contactToLead(c) ?? [])
  const result: ImportResult = leads.length
    ? await importLeads({ adminEmail: input.admin, account: input.account, listId: list.id, listName: list.name, columns: columnsOf(contacts), leads })
    : { listId: list.id, added: 0, alreadySaved: 0, alreadyUsers: 0, unsubscribed: 0, invalid: contacts.length }
  const stopped = await stopLeadsByEmail(
    contacts.filter((c) => stoppedInBrevo(c, input.brevoListId)).flatMap((c) => c.email ?? []),
    "unsubscribed",
    input.account,
  )

  const next = offset + contacts.length
  return {
    ...result,
    listName: list.name,
    stopped,
    nextOffset: contacts.length === BREVO_SYNC_PAGE && next < total ? next : null,
    total,
  }
}

/** For the Leads page's heading: "Sync from Brevo (anantgoyal.in)". */
export const brevoAccountLabel = (account: LeadAccount) => `Brevo (${ACCOUNTS[account].domain})`
