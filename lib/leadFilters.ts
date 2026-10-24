// lib/leadFilters.ts — finding leads (Admin → Broadcasts → Leads → All leads):
// search, the list they're on, whether they can still be emailed, what they
// did with the emails (never emailed, emailed, seen, clicked, within so many
// days), one of their columns ("Company contains bank") and when they were
// added. The same filter, saved, is a smart list (LeadList kind "smart"):
// its people are whoever matches it now. No server-only imports: the page
// builds filters with this, lib/leads.ts applies them.
import { z } from "zod"
import { FIELD_KEY_RE, LEAD_BASE_KEYS } from "@/lib/leadRules"

export const LEAD_STATUSES = ["active", "stopped", "unsubscribed", "bounced", "spam"] as const
export const LEAD_ACTIVITIES = ["never", "emailed", "seen", "not_seen", "clicked", "not_clicked"] as const
export const FIELD_OPS = ["contains", "is", "empty", "not_empty"] as const

export const leadFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  listId: z.string().min(1).max(64).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  activity: z.enum(LEAD_ACTIVITIES).optional(),
  // For emailed / seen / clicked: within the last so many days.
  days: z.number().int().min(1).max(3650).optional(),
  field: z
    .object({
      // A column's key (lib/leadRules.ts), or the lead's own name/email.
      key: z.string().regex(FIELD_KEY_RE),
      op: z.enum(FIELD_OPS),
      value: z.string().trim().max(200).optional(),
    })
    .optional(),
  // Added in the last so many days.
  addedDays: z.number().int().min(1).max(3650).optional(),
})
export type LeadFilter = z.infer<typeof leadFilterSchema>

export const STATUS_LABELS: Record<(typeof LEAD_STATUSES)[number], string> = {
  active: "Can be emailed",
  stopped: "Stopped (any reason)",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced or blocked",
  spam: "Marked it spam",
}
export const ACTIVITY_LABELS: Record<(typeof LEAD_ACTIVITIES)[number], string> = {
  never: "Never emailed",
  emailed: "Emailed",
  seen: "Seen an email",
  not_seen: "Emailed, never seen",
  clicked: "Clicked",
  not_clicked: "Emailed, never clicked",
}
export const OP_LABELS: Record<(typeof FIELD_OPS)[number], string> = { contains: "contains", is: "is", empty: "is empty", not_empty: "has a value" }

/** Whether a filter asks for anything at all. */
export const isEmptyFilter = (f: LeadFilter) => !f.q && !f.listId && !f.status && !f.activity && !f.field && !f.addedDays

/** The filter in words, for a smart list: "Clicked in the last 30 days · Company contains bank". */
export function describeFilter(f: LeadFilter, names: { lists?: Record<string, string>; columns?: Record<string, string> } = {}): string {
  const parts: string[] = []
  if (f.activity) parts.push(`${ACTIVITY_LABELS[f.activity]}${f.days && !["never", "not_seen", "not_clicked"].includes(f.activity) ? ` in the last ${f.days} days` : ""}`)
  if (f.field) {
    const label = names.columns?.[f.field.key] ?? f.field.key
    parts.push(`${label} ${OP_LABELS[f.field.op]}${f.field.op === "contains" || f.field.op === "is" ? ` "${f.field.value ?? ""}"` : ""}`)
  }
  if (f.status) parts.push(STATUS_LABELS[f.status])
  if (f.listId) parts.push(`on ${names.lists?.[f.listId] ? `"${names.lists[f.listId]}"` : "a list"}`)
  if (f.addedDays) parts.push(`added in the last ${f.addedDays} days`)
  if (f.q) parts.push(`matching "${f.q}"`)
  return parts.join(" · ") || "Every lead"
}

// What a lead did with the emails it was sent (lib/leads.ts works it out
// from the campaigns' people, by address).
export type Engagement = { emails: number; lastSentAt: Date | null; lastSeenAt: Date | null; lastClickedAt: Date | null }
export const NO_ENGAGEMENT: Engagement = { emails: 0, lastSentAt: null, lastSeenAt: null, lastClickedAt: null }

type LeadForFilter = { email: string; firstName: string | null; lastName: string | null; name: string | null; fields: unknown }

/** A lead's value for a column, or its own name and email. */
export function fieldValue(lead: LeadForFilter, key: string): string {
  if ((LEAD_BASE_KEYS as readonly string[]).includes(key)) return String(lead[key as keyof LeadForFilter] ?? "")
  const fields = lead.fields && typeof lead.fields === "object" && !Array.isArray(lead.fields) ? (lead.fields as Record<string, unknown>) : {}
  return typeof fields[key] === "string" ? (fields[key] as string) : ""
}

/**
 * The parts of a filter the database can't answer (one of their columns, and
 * what they did with the emails), checked on each lead. The rest (search,
 * list, status, when added) is in lib/leads.ts's query.
 */
export function matchesInMemory(lead: LeadForFilter, engagement: Engagement, f: LeadFilter, now: Date = new Date()): boolean {
  if (f.field) {
    const value = fieldValue(lead, f.field.key).trim().toLowerCase()
    const want = (f.field.value ?? "").trim().toLowerCase()
    if (f.field.op === "contains" && !value.includes(want)) return false
    if (f.field.op === "is" && value !== want) return false
    if (f.field.op === "empty" && value) return false
    if (f.field.op === "not_empty" && !value) return false
  }
  if (f.activity) {
    const since = f.days ? now.getTime() - f.days * 86_400_000 : -Infinity
    const within = (d: Date | null) => !!d && d.getTime() >= since
    const ok = {
      never: engagement.emails === 0,
      emailed: within(engagement.lastSentAt),
      seen: within(engagement.lastSeenAt),
      not_seen: engagement.emails > 0 && !engagement.lastSeenAt,
      clicked: within(engagement.lastClickedAt),
      not_clicked: engagement.emails > 0 && !engagement.lastClickedAt,
    }[f.activity]
    if (!ok) return false
  }
  return true
}
