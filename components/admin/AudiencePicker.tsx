"use client"

// Who an email goes to: one of the broadcast audiences (lib/segments.ts),
// the admin's leads (all, never emailed, or one uploaded list; lib/leads.ts),
// or a pasted list of addresses. Used by the AI writer's "Send it", Use again
// and Add people. audienceRequest turns the choice into what
// /api/admin/campaigns and /recipients take.
import { useEffect, useState } from "react"
import { AdminInput, AdminSelect } from "@/components/admin/ui"
import { SEGMENT_TYPES } from "@/lib/segments"
import { isLeadAudience, leadListAudience } from "@/lib/leadRules"

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

/** The saved leads lists, for the pickers; null while loading or when there are none to offer. */
export function useLeadLists(): LeadsSummary | null {
  const [leads, setLeads] = useState<LeadsSummary | null>(null)
  useEffect(() => {
    let live = true
    fetch("/api/admin/leads?only=lists")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LeadsSummary | null) => {
        if (live && data?.lists?.length) setLeads(data)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return leads
}

const count = (n: number) => n.toLocaleString("en-US")

/** The leads choices, grouped under "My leads"; nothing until some are uploaded. */
export function LeadAudienceOptions({ leads }: { leads: LeadsSummary | null }) {
  if (!leads) return null
  const subscribed = leads.totals.total - leads.totals.unsubscribed
  return (
    <optgroup label="My leads (people who don't use CarouseLabs yet)">
      <option value="leads:all">All my leads ({count(subscribed)})</option>
      <option value="leads:new">Leads never emailed ({count(leads.totals.neverEmailed)})</option>
      {leads.lists.map((l) => (
        <option key={l.id} value={leadListAudience(l.id)}>
          {l.kind === "smart" ? "Smart list" : "List"}: {l.name} ({count(l.count)})
        </option>
      ))}
    </optgroup>
  )
}

export function AudiencePicker({ value, onChange, id }: { value: Audience; onChange: (next: Audience) => void; id: string }) {
  const segment = SEGMENT_TYPES.find((s) => s.value === value.audience)
  const leads = useLeadLists()
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
      {isLeadAudience(value.audience) && (
        <p className="text-caption text-muted-foreground/80">
          Each lead&apos;s email gets an Unsubscribe link, and anyone who unsubscribed or has since signed up is left out.
        </p>
      )}
    </div>
  )
}
