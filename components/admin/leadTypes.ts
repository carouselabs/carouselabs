// What the Leads page's parts pass around: the lists and numbers
// (/api/admin/leads?only=lists, lib/leads.ts leadsOverview) and one row of
// the All leads table (listLeads).
import type { LeadFilter } from "@/lib/leadFilters"
import type { LeadColumn } from "@/lib/leadRules"

export type LeadListInfo = {
  id: string
  name: string
  fileName: string | null
  columns: LeadColumn[]
  createdBy: string
  createdAt: string
  // Older answers (before scripts/lead-lists.sql) have neither.
  kind?: "static" | "smart"
  filter?: LeadFilter | null
  count: number
}

export type LeadsOverview = {
  totals: { total: number; unsubscribed: number; neverEmailed: number }
  lists: LeadListInfo[]
  columns: LeadColumn[]
}

export type LeadRowInfo = {
  id: string
  email: string
  name: string | null
  fields: Record<string, string>
  lists: { id: string; name: string }[]
  createdAt: string
  lastEmailedAt: string | null
  emailCount: number
  lastSeenAt: string | null
  lastClickedAt: string | null
  unsubscribedAt: string | null
  // Why they stopped, when Brevo told us; null for our own Unsubscribe link.
  stopReason?: string | null
}

export const isSmart = (l: { kind?: string }) => l.kind === "smart"

export const count = (n: number) => n.toLocaleString("en-US")

export const STOPPED: Record<string, string> = { unsubscribed: "Unsubscribed", bounced: "Bounced", spam: "Marked spam", blocked: "Blocked by Brevo" }
