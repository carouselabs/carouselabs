"use client"

// Leads → All leads: the filters (lib/leadFilters.ts). Search, the list
// (fixed or smart), whether they can be emailed, what they did with the
// emails (within so many days), one of their columns ("Company contains
// bank") and when they were added. Typing waits a moment before searching.
import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { AdminButton, AdminInput, AdminSelect } from "@/components/admin/ui"
import {
  ACTIVITY_LABELS,
  FIELD_OPS,
  LEAD_ACTIVITIES,
  LEAD_STATUSES,
  OP_LABELS,
  STATUS_LABELS,
  isEmptyFilter,
  type LeadFilter,
} from "@/lib/leadFilters"
import type { LeadColumn } from "@/lib/leadRules"
import { isSmart, type LeadListInfo } from "./leadTypes"

// Their own details, then every column a list has.
const BASE_COLUMNS: LeadColumn[] = [
  { key: "name", label: "Full name" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "email", label: "Email" },
]
const DAYS = [7, 30, 90, 365]
// Activity that can be "in the last N days".
const DATED = new Set(["emailed", "seen", "clicked"])

export function filterColumns(columns: LeadColumn[]): LeadColumn[] {
  return [...BASE_COLUMNS, ...columns.filter((c) => !BASE_COLUMNS.some((b) => b.key === c.key))]
}

export function LeadFilterBar({
  filter,
  onChange,
  lists,
  columns,
}: {
  filter: LeadFilter
  onChange: (next: LeadFilter) => void
  lists: LeadListInfo[]
  columns: LeadColumn[]
}) {
  const [query, setQuery] = useState(filter.q ?? "")
  const [value, setValue] = useState(filter.field?.value ?? "")
  // The newest filter, so a pause in typing never undoes a choice made meanwhile.
  const latest = useRef({ filter, onChange })
  useEffect(() => {
    latest.current = { filter, onChange }
  })

  // Sends a change, and keeps it as the newest at once: two pauses ending
  // together each build on the other.
  const send = (patch: Partial<LeadFilter>) => {
    const next = { ...latest.current.filter, ...patch }
    for (const k of Object.keys(next) as (keyof LeadFilter)[]) if (next[k] === undefined) delete next[k]
    latest.current = { ...latest.current, filter: next }
    latest.current.onChange(next)
  }

  // Typing filters after a short pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = query.trim() || undefined
      if (q !== latest.current.filter.q) send({ q })
    }, 300)
    return () => clearTimeout(timer)
  }, [query])
  useEffect(() => {
    const timer = setTimeout(() => {
      const field = latest.current.filter.field
      if (!field || (field.op !== "contains" && field.op !== "is")) return
      const v = value.trim()
      if (v !== (field.value ?? "")) send({ field: { ...field, value: v } })
    }, 300)
    return () => clearTimeout(timer)
  }, [value])
  // A filter set from outside (See people, Edit filters, Clear) shows here;
  // what's being typed stays as typed.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the filter into the text box
  useEffect(() => setQuery((typed) => (typed.trim() === (filter.q ?? "") ? typed : (filter.q ?? ""))), [filter.q])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the filter into the text box
  useEffect(() => setValue((typed) => (typed.trim() === (filter.field?.value ?? "") ? typed : (filter.field?.value ?? ""))), [filter.field?.value])

  const set = send
  const fixed = lists.filter((l) => !isSmart(l))
  const smart = lists.filter(isSmart)
  const allColumns = filterColumns(columns)
  const needsValue = filter.field && (filter.field.op === "contains" || filter.field.op === "is")

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <AdminInput aria-label="Search leads" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-8" />
        </div>
        <AdminSelect aria-label="List" value={filter.listId ?? ""} onChange={(e) => set({ listId: e.target.value || undefined })} className="min-w-0 max-w-full sm:w-48">
          <option value="">All lists</option>
          {fixed.length > 0 && (
            <optgroup label="Lists">
              {fixed.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </optgroup>
          )}
          {smart.length > 0 && (
            <optgroup label="Smart lists">
              {smart.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </optgroup>
          )}
        </AdminSelect>
        <AdminSelect aria-label="Status" value={filter.status ?? ""} onChange={(e) => set({ status: (e.target.value || undefined) as LeadFilter["status"] })}>
          <option value="">Any status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          aria-label="Activity"
          value={filter.activity ?? ""}
          onChange={(e) => {
            const activity = (e.target.value || undefined) as LeadFilter["activity"]
            set({ activity, days: activity && DATED.has(activity) ? filter.days : undefined })
          }}
        >
          <option value="">Any activity</option>
          {LEAD_ACTIVITIES.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABELS[a]}
            </option>
          ))}
        </AdminSelect>
        {filter.activity && DATED.has(filter.activity) && (
          <AdminSelect aria-label="Within" value={filter.days ?? ""} onChange={(e) => set({ days: Number(e.target.value) || undefined })}>
            <option value="">Any time</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                In the last {d} days
              </option>
            ))}
          </AdminSelect>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AdminSelect
          aria-label="Column"
          value={filter.field?.key ?? ""}
          onChange={(e) => {
            const key = e.target.value
            set({ field: key ? { key, op: filter.field?.op ?? "contains", value: filter.field?.value ?? "" } : undefined })
          }}
        >
          <option value="">Any column…</option>
          {allColumns.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </AdminSelect>
        {filter.field && (
          <AdminSelect aria-label="Condition" value={filter.field.op} onChange={(e) => set({ field: { ...filter.field!, op: e.target.value as (typeof FIELD_OPS)[number] } })}>
            {FIELD_OPS.map((op) => (
              <option key={op} value={op}>
                {OP_LABELS[op]}
              </option>
            ))}
          </AdminSelect>
        )}
        {needsValue && <AdminInput aria-label="Value" placeholder="e.g. bank" value={value} maxLength={200} onChange={(e) => setValue(e.target.value)} className="min-w-[8rem] flex-1 sm:max-w-[14rem]" />}
        <AdminSelect aria-label="Added" value={filter.addedDays ?? ""} onChange={(e) => set({ addedDays: Number(e.target.value) || undefined })}>
          <option value="">Added any time</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              Added in the last {d} days
            </option>
          ))}
        </AdminSelect>
        {!isEmptyFilter(filter) && (
          <AdminButton variant="ghost" onClick={() => onChange({})}>
            <X aria-hidden />
            Clear filters
          </AdminButton>
        )}
      </div>
    </div>
  )
}
