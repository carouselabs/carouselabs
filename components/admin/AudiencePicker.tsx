"use client"

// Who an email goes to: one of the broadcast audiences (lib/segments.ts), or
// a pasted list of addresses. The same choices as the AI writer's "Who it's
// for", for Use again and Add people. audienceRequest turns the choice into
// what /api/admin/campaigns and /recipients take.
import { AdminInput, AdminSelect } from "@/components/admin/ui"
import { SEGMENT_TYPES } from "@/lib/segments"

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
  const segment = SEGMENT_TYPES.find((s) => s.value === value.audience)
  if (!segment) return null
  return segment.needsValue ? { recipients: segment.value, recipientValue: value.segmentValue.trim() || undefined } : { recipients: segment.value }
}

export function AudiencePicker({ value, onChange, id }: { value: Audience; onChange: (next: Audience) => void; id: string }) {
  const segment = SEGMENT_TYPES.find((s) => s.value === value.audience)
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
    </div>
  )
}
