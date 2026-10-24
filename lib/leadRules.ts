// lib/leadRules.ts
// Leads (Admin → Broadcasts → Leads): reading an uploaded CSV, matching its
// columns to the email address, the name and merge fields, and the lead
// audiences a campaign can go to. No server-only imports: the upload screen
// reads the file in the browser with this, and lib/leads.ts checks what it
// sends with the same rules.
import { AVAILABLE_VARIABLES } from "@/lib/broadcastRender"

export const LEAD_IMPORT_MAX_ROWS = 20_000
// Rows per request while uploading, so a big file never times out.
export const LEAD_IMPORT_CHUNK = 500
const MAX_NAME = 100
const MAX_VALUE = 500

// The merge fields every lead has, whatever the file had.
export const LEAD_BASE_KEYS = ["firstName", "lastName", "name", "email"] as const

// A column's merge field: "Company name" → {{companyName}}.
export const FIELD_KEY_RE = /^[a-z][A-Za-z0-9]{0,39}$/

export type ColumnRole = "email" | "firstName" | "lastName" | "name" | "field" | "skip"
export type ColumnMapping = { label: string; role: ColumnRole; key: string }
export type LeadColumn = { key: string; label: string }

export type LeadInput = {
  email: string
  firstName: string | null
  lastName: string | null
  name: string | null
  fields: Record<string, string>
}

// The same check lib/broadcast.ts makes, plus the longest address there is.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The address as it's saved (lowercase, no "mailto:" or <>), or null when it isn't one. */
export function cleanEmail(raw: string | undefined | null): string | null {
  const email = (raw ?? "")
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/^<(.*)>$/, "$1")
    .trim()
    .toLowerCase()
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null
}

// The file's separator: commas, or the semicolons and tabs some spreadsheet
// apps save with. Read from the first line, outside quotes.
function delimiterOf(text: string): string {
  let line = ""
  let quoted = false
  for (const ch of text) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && (ch === "\n" || ch === "\r")) break
    else if (!quoted) line += ch
  }
  const count = (d: string) => line.split(d).length - 1
  return [";", "\t"].reduce((best, d) => (count(d) > count(best) ? d : best), ",")
}

/** The file's rows, each a list of cells (trimmed); blank rows left out. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "")
  const delimiter = delimiterOf(src)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch !== '"') cell += ch
      else if (src[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = false
    } else if (ch === '"' && cell.trim() === "") {
      cell = ""
      quoted = true
    } else if (ch === delimiter) {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""))
}

/** A column's merge-field key: "Company name" → "companyName", "2nd phone" → "field2ndPhone". */
export function fieldKey(label: string): string {
  const words = label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
  const key = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("")
  const safe = /^[a-z]/.test(key) ? key : `field${key.charAt(0).toUpperCase()}${key.slice(1)}`
  return safe.slice(0, 40)
}

const SIMPLE = (label: string) => label.toLowerCase().replace(/[^a-z]/g, "")
const FIRST_NAMES = new Set(["firstname", "first", "givenname", "fname", "forename"])
const LAST_NAMES = new Set(["lastname", "last", "surname", "familyname", "lname"])
const FULL_NAMES = new Set(["name", "fullname", "contactname", "contact", "person"])

function guessRole(label: string): ColumnRole {
  const simple = SIMPLE(label)
  if (simple.includes("email") || simple === "mail") return "email"
  if (FIRST_NAMES.has(simple)) return "firstName"
  if (LAST_NAMES.has(simple)) return "lastName"
  if (FULL_NAMES.has(simple)) return "name"
  return "field"
}

const RESERVED = new Set<string>(LEAD_BASE_KEYS)

/** A first guess at what each column is: one email, one of each name, the rest merge fields. */
export function autoMapping(headers: string[]): ColumnMapping[] {
  const taken = new Set<ColumnRole>()
  const keys = new Set<string>()
  return headers.map((header, i) => {
    const label = header.trim() || `Column ${i + 1}`
    let role = guessRole(label)
    // A second email column ("Personal email") is left out; a second name kept as a field.
    if (role !== "field" && taken.has(role)) role = role === "email" ? "skip" : "field"
    if (role !== "field") taken.add(role)
    let key = fieldKey(label)
    for (let n = 2; RESERVED.has(key) || keys.has(key); n++) key = `${fieldKey(label).slice(0, 37)}${n}`
    if (role === "field") keys.add(key)
    return { label, role, key }
  })
}

/** Why these choices can't be imported yet, or null. */
export function mappingProblem(mapping: ColumnMapping[]): string | null {
  const emails = mapping.filter((m) => m.role === "email").length
  if (emails === 0) return "Pick the column with the email addresses."
  if (emails > 1) return "Only one column can be the email address."
  for (const role of ["firstName", "lastName", "name"] as const) {
    if (mapping.filter((m) => m.role === role).length > 1) return "Only one column can be each part of the name."
  }
  const seen = new Set<string>()
  for (const m of mapping.filter((m) => m.role === "field")) {
    if (!FIELD_KEY_RE.test(m.key)) return `{{${m.key}}} must start with a small letter and use only letters and numbers.`
    if (RESERVED.has(m.key)) return `{{${m.key}}} is already every lead's ${m.key === "email" ? "email" : "name"}. Give this column another name.`
    if (seen.has(m.key)) return `Two columns are both {{${m.key}}}. Give one another name.`
    seen.add(m.key)
  }
  return null
}

const cell = (row: string[], index: number, max: number) => {
  const value = (row[index] ?? "").trim().slice(0, max)
  return value || null
}

/**
 * The file's rows (after the header) as leads. Rows without a real address
 * are counted as invalid, and an address the file has twice is kept once.
 */
export function buildLeads(rows: string[][], mapping: ColumnMapping[]): { leads: LeadInput[]; invalid: number; duplicates: number } {
  const at = (role: ColumnRole) => mapping.findIndex((m) => m.role === role)
  const [emailAt, firstAt, lastAt, nameAt] = [at("email"), at("firstName"), at("lastName"), at("name")]
  const fieldCols = mapping.flatMap((m, i) => (m.role === "field" ? [{ i, key: m.key }] : []))
  const seen = new Set<string>()
  const leads: LeadInput[] = []
  let invalid = 0
  let duplicates = 0
  for (const row of rows) {
    const email = cleanEmail(row[emailAt])
    if (!email) {
      invalid++
      continue
    }
    if (seen.has(email)) {
      duplicates++
      continue
    }
    seen.add(email)
    const fields: Record<string, string> = {}
    for (const f of fieldCols) {
      const value = cell(row, f.i, MAX_VALUE)
      if (value) fields[f.key] = value
    }
    leads.push({
      email,
      firstName: firstAt >= 0 ? cell(row, firstAt, MAX_NAME) : null,
      lastName: lastAt >= 0 ? cell(row, lastAt, MAX_NAME) : null,
      name: nameAt >= 0 ? cell(row, nameAt, MAX_NAME) : null,
      fields,
    })
  }
  return { leads, invalid, duplicates }
}

/**
 * What a lead's {{merge fields}} become in their email: their first name
 * (from the name when the file had no first name, "there" when it had
 * neither), the rest of their name, their email and the file's columns.
 */
export function leadValues(lead: Pick<LeadInput, "email" | "firstName" | "lastName" | "name"> & { fields: unknown }): Record<string, string> {
  const name = lead.name?.trim() || [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim()
  const first = lead.firstName?.trim() || name.split(/\s+/)[0] || ""
  const fields = lead.fields && typeof lead.fields === "object" && !Array.isArray(lead.fields) ? (lead.fields as Record<string, unknown>) : {}
  const extra = Object.fromEntries(Object.entries(fields).filter(([k, v]) => FIELD_KEY_RE.test(k) && typeof v === "string")) as Record<string, string>
  return { ...extra, email: lead.email, firstName: first || "there", lastName: lead.lastName?.trim() ?? "", name: name || first || "there" }
}

// ── Lead audiences ──────────────────────────────────────────────────────
// What a campaign goes to: every lead, the ones no campaign has reached yet,
// or one uploaded list. Leads who unsubscribed, and anyone who has since
// signed up to CarouseLabs, are never in any of them.

export type LeadAudience = "leads:all" | "leads:new" | `leads:list:${string}`
export const LEAD_AUDIENCE_RE = /^leads:(all|new|list:[\w-]{1,64})$/

export function isLeadAudience(value: unknown): value is LeadAudience {
  return typeof value === "string" && LEAD_AUDIENCE_RE.test(value)
}

export function parseLeadAudience(value: string): { kind: "all" } | { kind: "new" } | { kind: "list"; listId: string } | null {
  if (!isLeadAudience(value)) return null
  if (value === "leads:all") return { kind: "all" }
  if (value === "leads:new") return { kind: "new" }
  return { kind: "list", listId: value.slice("leads:list:".length) }
}

export const leadListAudience = (listId: string): LeadAudience => `leads:list:${listId}`

/** "All my leads", "Leads never emailed", "Leads: Delhi founders" (listName: what the campaign saved). */
export function leadAudienceLabel(value: string, listName?: string | null): string {
  const parsed = parseLeadAudience(value)
  if (!parsed) return value
  if (parsed.kind === "all") return "All my leads"
  if (parsed.kind === "new") return "Leads never emailed"
  return `Leads: ${listName || "a list"}`
}

// ── Merge fields an email may use ───────────────────────────────────────

/** Every {{merge field}} in some text, once each. */
export function mergeFieldsIn(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))]
}

const USER_KEYS = new Set<string>(AVAILABLE_VARIABLES.map((v) => v.key))

/**
 * Why an email can't go to these people, or null: users have the standard
 * merge fields; leads have their name, email and their files' columns
 * (leadKeys), not the account ones like {{plan}}.
 */
export function mergeFieldProblem(text: string, forLeads: boolean, leadKeys: Iterable<string> = []): string | null {
  const allowed = forLeads ? new Set<string>([...LEAD_BASE_KEYS, ...leadKeys]) : USER_KEYS
  const missing = mergeFieldsIn(text).filter((k) => !allowed.has(k))
  if (missing.length === 0) return null
  const list = missing.map((k) => `{{${k}}}`).join(", ")
  return forLeads
    ? `This email uses ${list}, which your leads don't have. Take ${missing.length === 1 ? "it" : "them"} out, or upload leads with ${missing.length === 1 ? "that column" : "those columns"}.`
    : `This email uses ${list}, which only leads have. Take ${missing.length === 1 ? "it" : "them"} out, or send it to your leads.`
}
