"use client"

// Engage → Users. Filtering, sorting and paging happen on the server; this
// page only ever holds one page of rows. Filters live in the URL, so a view
// can be bookmarked or shared, and saved here by name (in this browser).
// Selected users take one bulk action at a time; the list downloads as CSV.
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Columns3, Plus, Search, X } from "lucide-react"
import { AdminButton, AdminInput, AdminSelect, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { ENGAGE_FEATURES, FEATURE_LABELS } from "@/lib/engage/features"
import type { UserListRow } from "@/lib/engage/adminQueries"
import { GrantAccessModal } from "./GrantAccessForm"
import { BulkActionModal, type BulkAction } from "./BulkActionModal"
import {
  AccessPill,
  CsvLink,
  EmptyState,
  ErrorState,
  Pill,
  SkeletonBlock,
  fmtNumber,
  fmtRelative,
  useAdminApi,
  useStoredState,
} from "./shared"

interface Page {
  rows: UserListRow[]
  total: number
  page: number
  pageSize: number
}

const ACCESS_OPTIONS = [
  ["all", "All access"],
  ["paid", "Paid"],
  ["granted", "Free access (granted)"],
  ["free", "Free plan"],
  ["suspended", "Paused or suspended"],
  ["overrides", "Has custom limits"],
] as const
const ACTIVITY_OPTIONS = [
  ["any", "Any activity"],
  ["today", "Active today"],
  ["7d", "Active, last 7 days"],
  ["30d", "Active, last 30 days"],
  ["inactive30", "Inactive 30+ days"],
  ["never", "Never signed in"],
] as const
// Which of the two extensions they use (one plan covers both).
const PLATFORM_OPTIONS = [
  ["any", "Any extension"],
  ["linkedin", "Uses LinkedIn"],
  ["x", "Uses X"],
] as const
const SORT_OPTIONS = [
  ["last_active", "Last active"],
  ["usage_month", "Most generated this month"],
  ["newest", "Newest"],
  ["oldest", "Oldest"],
  ["email", "Email A–Z"],
] as const

const COLUMNS = ["access", "month", "lastActive", "version", "joined", "tags"] as const
type Column = (typeof COLUMNS)[number]
const COLUMN_LABELS: Record<Column, string> = {
  access: "Access",
  month: "This month",
  lastActive: "Last active",
  version: "Extension",
  joined: "Joined",
  tags: "Tags",
}

const NO_SELECTION = new Map<string, string>()

// A named set of filters, kept in this browser.
interface SavedView {
  name: string
  query: string
}

// "1.3.0 · X 1.0.0": each extension they use, with its version when known.
function extensionCell(u: UserListRow): string {
  const parts = u.extensions.map((p) =>
    p === "x" ? `X ${u.xExtensionVersion ?? ""}`.trim() : (u.extensionVersion ?? "LinkedIn"),
  )
  return parts.length > 0 ? parts.join(" · ") : "—"
}

export function EngageUsersTable() {
  const router = useRouter()
  const params = useSearchParams()
  const { toast } = useToast()
  const [columns, setColumns] = useStoredState<Column[]>("engage-admin:user-columns", [...COLUMNS])
  const [showColumns, setShowColumns] = useState(false)
  const [adding, setAdding] = useState(false)
  const [views, setViews] = useStoredState<SavedView[]>("engage-admin:user-views", [])
  const [naming, setNaming] = useState<string | null>(null)
  // Selected users, by id with their email, for the page they were selected
  // on: another page or filter starts with nothing selected.
  const [selection, setSelection] = useState<{ url: string; ids: Map<string, string> }>({ url: "", ids: new Map() })
  const [bulk, setBulk] = useState<BulkAction | null>(null)

  const filters = {
    q: params.get("q") ?? "",
    access: params.get("access") ?? "all",
    activity: params.get("activity") ?? "any",
    platform: params.get("platform") ?? "any",
    tag: params.get("tag") ?? "",
    sort: params.get("sort") ?? "last_active",
    page: Number(params.get("page") ?? "1") || 1,
  }

  function setFilter(patch: Partial<Record<keyof typeof filters, string | number>>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries({ page: 1, ...patch })) {
      const s = String(v)
      if (!s || (k === "page" && s === "1") || (k === "access" && s === "all") || (k === "activity" && s === "any") || (k === "platform" && s === "any") || (k === "sort" && s === "last_active")) next.delete(k)
      else next.set(k, s)
    }
    router.replace(`?${next.toString()}`, { scroll: false })
  }

  // Search waits for a pause in typing.
  const [query, setQuery] = useState(filters.q)
  useEffect(() => {
    if (query === filters.q) return
    const t = setTimeout(() => setFilter({ q: query.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const url = useMemo(() => {
    const p = new URLSearchParams({ access: filters.access, activity: filters.activity, sort: filters.sort, page: String(filters.page), pageSize: "50" })
    if (filters.q) p.set("q", filters.q)
    if (filters.tag) p.set("tag", filters.tag)
    if (filters.platform !== "any") p.set("platform", filters.platform)
    return `/api/admin/engage/users?${p.toString()}`
  }, [filters.access, filters.activity, filters.platform, filters.sort, filters.page, filters.q, filters.tag])
  const { data, error, loading, reload } = useAdminApi<Page>(url)
  const selected = selection.url === url ? selection.ids : NO_SELECTION
  const setSelected = (ids: Map<string, string>) => setSelection({ url, ids })

  // The filters, without paging, for a saved view and the CSV download.
  const filterQuery = useMemo(() => {
    const p = new URLSearchParams(params.toString())
    p.delete("page")
    return p.toString()
  }, [params])
  const activeView = views.find((v) => v.query === filterQuery)
  const pageRows = data?.rows ?? []
  const allSelected = pageRows.length > 0 && pageRows.every((u) => selected.has(u.id))
  function toggleAll(users: UserListRow[], on: boolean) {
    const next = new Map(selected)
    for (const u of users) {
      if (on) next.set(u.id, u.email)
      else next.delete(u.id)
    }
    setSelected(next)
  }
  const toggle = (u: UserListRow, on: boolean) => toggleAll([u], on)

  const visible = (c: Column) => columns.includes(c)
  const filtered = filters.q || filters.access !== "all" || filters.activity !== "any" || filters.platform !== "any" || filters.tag
  const from = data ? (data.page - 1) * data.pageSize + 1 : 0
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-white">Engage users</h1>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">Everyone who has signed in to the extension, paid for it, or been given access.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvLink type="users" query={filterQuery} />
          <AdminButton onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add user
          </AdminButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]" aria-hidden />
          <AdminInput
            aria-label="Search users"
            className="w-full pl-8"
            placeholder="Search name, email or user ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <AdminSelect aria-label="Access" value={filters.access} onChange={(e) => setFilter({ access: e.target.value })}>
          {ACCESS_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect aria-label="Activity" value={filters.activity} onChange={(e) => setFilter({ activity: e.target.value })}>
          {ACTIVITY_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect aria-label="Extension" value={filters.platform} onChange={(e) => setFilter({ platform: e.target.value })}>
          {PLATFORM_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminSelect>
        <AdminInput
          aria-label="Tag"
          className="w-[120px]"
          placeholder="Tag"
          defaultValue={filters.tag}
          onKeyDown={(e) => e.key === "Enter" && setFilter({ tag: (e.target as HTMLInputElement).value.trim() })}
          onBlur={(e) => e.target.value.trim() !== filters.tag && setFilter({ tag: e.target.value.trim() })}
        />
        <AdminSelect aria-label="Sort" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
          {SORT_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </AdminSelect>
        <div className="relative">
          <AdminButton variant="secondary" onClick={() => setShowColumns((s) => !s)}>
            <Columns3 className="h-3.5 w-3.5" aria-hidden />
            Columns
          </AdminButton>
          {showColumns && (
            <div className="absolute right-0 z-20 mt-1 w-48 space-y-1 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-2 shadow-xl">
              {COLUMNS.map((c) => (
                <label key={c} className="flex items-center gap-2 rounded px-2 py-1.5 text-[12.5px] text-[#D0D0D0] hover:bg-[#232323]">
                  <input
                    type="checkbox"
                    className="accent-[#7C3AED]"
                    checked={visible(c)}
                    onChange={(e) => setColumns(e.target.checked ? [...columns, c] : columns.filter((x) => x !== c))}
                  />
                  {COLUMN_LABELS[c]}
                </label>
              ))}
            </div>
          )}
        </div>
        {filtered && (
          <AdminButton
            variant="ghost"
            onClick={() => {
              setQuery("")
              router.replace("?", { scroll: false })
            }}
          >
            Clear filters
          </AdminButton>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Saved views" role="group">
        {views.length > 0 && (
          <AdminSelect
            aria-label="Saved view"
            value={activeView?.name ?? ""}
            onChange={(e) => {
              const view = views.find((v) => v.name === e.target.value)
              if (!view) return
              setQuery(new URLSearchParams(view.query).get("q") ?? "")
              router.replace(`?${view.query}`, { scroll: false })
            }}
          >
            <option value="">Saved views…</option>
            {views.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </AdminSelect>
        )}
        {activeView ? (
          <AdminButton variant="ghost" onClick={() => setViews(views.filter((v) => v.name !== activeView.name))}>
            Delete view “{activeView.name}”
          </AdminButton>
        ) : naming === null ? (
          filtered && (
            <AdminButton variant="ghost" onClick={() => setNaming("")}>
              Save these filters
            </AdminButton>
          )
        ) : (
          <form
            className="flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              const name = naming.trim()
              if (!name) return
              setViews([...views.filter((v) => v.name !== name), { name, query: filterQuery }])
              setNaming(null)
            }}
          >
            <AdminInput aria-label="View name" autoFocus maxLength={40} placeholder="Name this view" value={naming} onChange={(e) => setNaming(e.target.value)} />
            <AdminButton type="submit" disabled={!naming.trim()}>
              Save
            </AdminButton>
            <AdminButton type="button" variant="ghost" onClick={() => setNaming(null)}>
              Cancel
            </AdminButton>
          </form>
        )}
      </div>

      {selected.size > 0 && (
        <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-lg border border-[#3B2A6B] bg-[#1C1530] px-3 py-2">
          <span className="text-[12.5px] font-medium text-white">{selected.size} selected</span>
          <AdminButton variant="secondary" onClick={() => setBulk("grant")}>
            Give free access
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => setBulk("suspend")}>
            Pause
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => setBulk("resume")}>
            Resume
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => setBulk("tag")}>
            Add tag
          </AdminButton>
          <AdminButton variant="ghost" onClick={() => setSelected(new Map())}>
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear selection
          </AdminButton>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="max-h-[calc(100vh-280px)] overflow-auto">
            <table className="w-full text-left text-[12.5px]" aria-busy={loading}>
              <thead className="sticky top-0 z-10 bg-[#161616]">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">
                  <th className="w-8 border-b border-[#2A2A2A] py-2.5 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Select everyone on this page"
                      className="accent-[#7C3AED]"
                      checked={allSelected}
                      disabled={pageRows.length === 0}
                      onChange={(e) => toggleAll(pageRows, e.target.checked)}
                    />
                  </th>
                  <th className="border-b border-[#2A2A2A] px-4 py-2.5">User</th>
                  {visible("access") && <th className="border-b border-[#2A2A2A] px-4 py-2.5">Access</th>}
                  {visible("month") && <th className="border-b border-[#2A2A2A] px-4 py-2.5 text-right">This month</th>}
                  {visible("lastActive") && <th className="border-b border-[#2A2A2A] px-4 py-2.5">Last active</th>}
                  {visible("version") && <th className="border-b border-[#2A2A2A] px-4 py-2.5">Extension</th>}
                  {visible("joined") && <th className="border-b border-[#2A2A2A] px-4 py-2.5">Joined</th>}
                  {visible("tags") && <th className="border-b border-[#2A2A2A] px-4 py-2.5">Tags</th>}
                </tr>
              </thead>
              <tbody>
                {!data && loading
                  ? Array.from({ length: 8 }, (_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3" colSpan={2 + columns.length}>
                          <SkeletonBlock className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  : data?.rows.map((u) => (
                      <tr key={u.id} className="border-b border-[#232323] transition-colors hover:bg-[#1F1F1F]">
                        <td className="py-2.5 pl-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${u.email}`}
                            className="accent-[#7C3AED]"
                            checked={selected.has(u.id)}
                            onChange={(e) => toggle(u, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/admin/engage/users/${u.id}`}
                            className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                          >
                            <span className="block font-medium text-white">{u.name ?? u.email}</span>
                            {u.name && <span className="block text-[11.5px] text-[#8A8A8A]">{u.email}</span>}
                          </Link>
                        </td>
                        {visible("access") && (
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <AccessPill {...u} />
                              {u.hasOverrides && <Pill tone="amber">Custom limits</Pill>}
                            </div>
                          </td>
                        )}
                        {visible("month") && (
                          <td
                            className="px-4 py-2.5 text-right tabular-nums text-[#D0D0D0]"
                            title={ENGAGE_FEATURES.map((f) => `${FEATURE_LABELS[f]}: ${u.monthByFeature[f] ?? 0}`).join("\n")}
                          >
                            {fmtNumber(u.monthTotal)}
                          </td>
                        )}
                        {visible("lastActive") && <td className="whitespace-nowrap px-4 py-2.5 text-[#B0B0B0]">{fmtRelative(u.lastActiveAt)}</td>}
                        {visible("version") && (
                          <td className="px-4 py-2.5 tabular-nums text-[#B0B0B0]">
                            {extensionCell(u)}
                          </td>
                        )}
                        {visible("joined") && <td className="whitespace-nowrap px-4 py-2.5 text-[#B0B0B0]">{fmtDate(u.createdAt)}</td>}
                        {visible("tags") && (
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {u.tags.map((t) => (
                                <button key={t} onClick={() => setFilter({ tag: t })} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]">
                                  <Pill>{t}</Pill>
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
            {data && data.rows.length === 0 && (
              <div className="p-6">
                <EmptyState
                  title={filtered ? "No users match these filters" : "No Engage users yet"}
                  body={filtered ? "Try a different search or clear the filters." : "People appear here once they sign in to the extension, or when you add one."}
                />
              </div>
            )}
          </div>
          {data && data.total > 0 && (
            <div className="flex items-center justify-between border-t border-[#2A2A2A] px-4 py-2.5 text-[12px] text-[#8A8A8A]">
              <span className="tabular-nums">
                {fmtNumber(from)}–{fmtNumber(to)} of {fmtNumber(data.total)}
              </span>
              <div className="flex gap-1">
                <AdminButton variant="ghost" disabled={data.page <= 1} onClick={() => setFilter({ page: data.page - 1 })}>
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Previous
                </AdminButton>
                <AdminButton variant="ghost" disabled={to >= data.total} onClick={() => setFilter({ page: data.page + 1 })}>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </AdminButton>
              </div>
            </div>
          )}
        </div>
      )}

      <BulkActionModal
        action={bulk}
        users={[...selected].map(([id, email]) => ({ id, email }))}
        onClose={() => setBulk(null)}
        onDone={(message) => {
          toast(message, "success")
          setSelected(new Map())
          reload()
        }}
      />

      <GrantAccessModal
        open={adding}
        onClose={() => setAdding(false)}
        onDone={(message) => {
          setAdding(false)
          toast(message, "success")
          reload()
        }}
      />
    </div>
  )
}
