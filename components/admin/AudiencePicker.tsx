"use client"

// Who an email goes to: one of the broadcast audiences (lib/segments.ts),
// the admin's leads (all, never emailed, or one uploaded list; lib/leads.ts),
// CarouseLabs' and Anant Goyal's in their own groups (lib/leadAccounts.ts),
// or a pasted list of addresses. Used by the AI writer's "Send it", Use again
// and Add people. audienceRequest turns the choice into what
// /api/admin/campaigns and /recipients take.
import { useEffect, useState } from "react"
import { AdminInput, AdminSelect } from "@/components/admin/ui"
import { SEGMENT_TYPES } from "@/lib/segments"
import { isLeadAudience, leadAudience, leadAudienceAccount, leadListAudience } from "@/lib/leadRules"
import { ACCOUNTS, DEFAULT_ACCOUNT, type LeadAccount } from "@/lib/leadAccounts"
import { withAccount } from "./leadAccountContext"

export type Audience = { audience: string; segmentValue: string; customList: string }

export const EMPTY_AUDIENCE: Audience = { audience: "engage_linkedin", segmentValue: "", customList: "" }

const customEmails = (list: string) =>
  list
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean)

/** null until the choice is complete (a custom list needs at least one address). */
export function audienceRequest(value: Audience): { recipients: string | string[]; recipientValue?: string } | null {
  if (value.audience === "custom") {
    const emails = customEmails(value.customList)
    return emails.length ? { recipients: emails } : null
  }
  if (isLeadAudience(value.audience)) return { recipients: value.audience }
  const segment = SEGMENT_TYPES.find((s) => s.value === value.audience)
  if (!segment) return null
  return segment.needsValue ? { recipients: segment.value, recipientValue: value.segmentValue.trim() || undefined } : { recipients: segment.value }
}

// kind: a smart list (a saved filter) fills itself; older answers have none.
export type LeadListSummary = { id: string; name: string; count: number; kind?: "static" | "smart" }
type LeadsSummary = { totals: { total: number; unsubscribed: number; neverEmailed: number }; lists: LeadListSummary[] }

/** One account's saved leads lists, for the pickers; null while loading or when there are none to offer. */
export function useLeadLists(account: LeadAccount = DEFAULT_ACCOUNT): LeadsSummary | null {
  const [leads, setLeads] = useState<LeadsSummary | null>(null)
  useEffect(() => {
    let live = true
    fetch(withAccount("/api/admin/leads?only=lists", account))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LeadsSummary | null) => {
        if (live && data?.lists?.length) setLeads(data)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [account])
  return leads
}

const count = (n: number) => n.toLocaleString("en-US")

/** One account's leads choices in their own group ("My leads", "Anant Goyal's leads"); nothing until it has some. */
export function LeadAudienceOptions({ leads, account = DEFAULT_ACCOUNT }: { leads: LeadsSummary | null; account?: LeadAccount }) {
  if (!leads) return null
  const subscribed = leads.totals.total - leads.totals.unsubscribed
  const label =
    account === DEFAULT_ACCOUNT ? "My leads (people who don't use CarouseLabs yet)" : `${ACCOUNTS[account].label}'s leads`
  const prefix = account === DEFAULT_ACCOUNT ? "" : `${ACCOUNTS[account].label}: `
  return (
    <optgroup label={label}>
      <option value={leadAudience("all", account)}>
        {prefix}All {account === DEFAULT_ACCOUNT ? "my " : ""}leads ({count(subscribed)})
      </option>
      <option value={leadAudience("new", account)}>
        {prefix}Leads never emailed ({count(leads.totals.neverEmailed)})
      </option>
      {leads.lists.map((l) => (
        <option key={l.id} value={leadListAudience(l.id, account)}>
          {prefix}
          {l.kind === "smart" ? "Smart list" : "List"}: {l.name} ({count(l.count)})
        </option>
      ))}
    </optgroup>
  )
}

export function AudiencePicker({ value, onChange, id }: { value: Audience; onChange: (next: Audience) => void; id: string }) {
  const segment = SEGMENT_TYPES.find((s) => s.value === value.audience)
  const leads = useLeadLists()
  const anantLeads = useLeadLists("anant")
  const account = leadAudienceAccount(value.audience)
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-caption font-semibold text-muted-foreground">
        Who it&apos;s for
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <AdminSelect id={id} value={value.audience} onChange={(e) => onChange({ ...value, audience: e.target.value })} className="min-w-[180px] flex-1">
          {SEGMENT_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
          <option value="custom">Custom list</option>
          <LeadAudienceOptions leads={leads} />
          <LeadAudienceOptions leads={anantLeads} account="anant" />
        </AdminSelect>
        {segment?.needsValue && (
          <AdminInput
            type="number"
            min={1}
            value={value.segmentValue}
            onChange={(e) => onChange({ ...value, segmentValue: e.target.value })}
            placeholder={segment.valuePlaceholder}
            aria-label={segment.valueLabel}
            className="w-28"
          />
        )}
      </div>
      {value.audience === "custom" && (
        <textarea
          value={value.customList}
          onChange={(e) => onChange({ ...value, customList: e.target.value })}
          rows={2}
          placeholder="person@example.com, another@example.com"
          aria-label="Email addresses"
          className="w-full rounded-control-sm border border-border bg-background p-2.5 text-label text-foreground outline-none placeholder:text-muted-foreground/80 focus:border-brand"
        />
      )}
      {isLeadAudience(value.audience) && account === DEFAULT_ACCOUNT && (
        <p className="text-caption text-muted-foreground/80">
          Each lead&apos;s email gets an Unsubscribe link, and anyone who unsubscribed or has since signed up is left out.
        </p>
      )}
      {account && account !== DEFAULT_ACCOUNT && (
        <p className="text-caption text-muted-foreground/80">
          {ACCOUNTS[account].label}&apos;s leads: it starts from his sender ({ACCOUNTS[account].sender.email}), and any sender can be picked. Each email gets an
          Unsubscribe link, and anyone who unsubscribed is left out.
        </p>
      )}
    </div>
  )
}
