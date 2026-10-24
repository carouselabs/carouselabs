"use client"

// /admin/broadcasts/leads — people who don't use CarouseLabs yet, uploaded
// from CSV files (lib/leads.ts): upload a file (LeadsUpload), see each list
// and everyone saved, and delete a list. Emailing them is a campaign: in the
// AI writer or the composer, "Who it's for" → My leads. Their emails go
// through Brevo (BrevoSetup shows whether it's ready).
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, MailX, Search, Sparkles, Trash2, Users } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, AdminSelect, ConfirmModal, Spinner, StatCard, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { LeadsUpload } from "./LeadsUpload"
import { BrevoSetup } from "./BrevoSetup"

type LeadList = { id: string; name: string; fileName: string | null; columns: { key: string; label: string }[]; createdBy: string; createdAt: string; count: number }
type Lead = {
  id: string
  email: string
  name: string | null
  fields: Record<string, string>
  lists: { id: string; name: string }[]
  createdAt: string
  lastEmailedAt: string | null
  emailCount: number
  unsubscribedAt: string | null
  // Why they stopped, when Brevo told us; null for our own Unsubscribe link.
  stopReason?: string | null
}
type LeadsPage = {
  totals: { total: number; unsubscribed: number; neverEmailed: number }
  lists: LeadList[]
  page: number
  pageSize: number
  total: number
  leads: Lead[]
}

const count = (n: number) => n.toLocaleString("en-US")

const STOPPED: Record<string, string> = { unsubscribed: "Unsubscribed", bounced: "Bounced", spam: "Marked spam", blocked: "Blocked by Brevo" }

export function LeadsManager() {
  const { toast } = useToast()
  const [data, setData] = useState<LeadsPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listId, setListId] = useState("")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<LeadList | null>(null)
  const [busy, setBusy] = useState(false)

  // Typing searches after a short pause, from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) })
    if (listId) params.set("list", listId)
    if (search) params.set("q", search)
    try {
      const res = await fetch(`/api/admin/leads?${params}`, { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't load the leads")
      setData(body)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the leads")
    }
  }, [page, listId, search])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() sets state after its fetch
  useEffect(() => void load(), [load])

  async function deleteList(list: LeadList) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/leads/lists/${list.id}`, { method: "DELETE" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Couldn't delete the list")
      toast(`Deleted "${list.name}" and ${count(body.removed)} leads only on it`, "success")
      if (listId === list.id) setListId("")
      setDeleting(null)
      await load()
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete the list", "error")
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/admin/broadcasts" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        Broadcasts
      </Link>
      <Link
        href="/admin/broadcasts/writer"
        className="inline-flex items-center gap-1.5 rounded-control-sm bg-brand/15 px-3 py-1.5 text-caption font-semibold text-foreground transition-colors hover:bg-brand/25"
      >
        <Sparkles className="size-3.5 text-brand" aria-hidden />
        Write an email for your leads
      </Link>
    </div>
  )

  if (error && !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <AdminCard>
          <p className="text-label text-danger">{error}</p>
        </AdminCard>
      </div>
    )
  }
  if (!data) return <Spinner label="Loading leads…" />

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const columns = (listId ? data.lists.filter((l) => l.id === listId) : data.lists).flatMap((l) => l.columns)
  const shownColumns = [...new Map(columns.map((c) => [c.key, c])).values()].slice(0, 3)

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads saved" value={count(data.totals.total)} icon={<Users />} />
        <StatCard label="Never emailed" value={count(data.totals.neverEmailed)} hint="No campaign has reached them yet" />
        <StatCard label="Stopped" value={count(data.totals.unsubscribed)} icon={<MailX />} hint="Unsubscribed, bounced or marked spam: never emailed again" />
        <StatCard label="Lists" value={count(data.lists.length)} />
      </div>

      <LeadsUpload onSaved={() => void load()} />

      <BrevoSetup />

      <AdminCard title={`Lists (${data.lists.length})`}>
        {data.lists.length === 0 ? (
          <p className="text-caption text-muted-foreground">No lists yet. Upload a CSV above and it shows here.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.lists.map((l) => (
              <li key={l.id} aria-label={`List ${l.name}`} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-label font-semibold text-foreground">{l.name}</span>
                  <span className="truncate text-caption text-muted-foreground">
                    {count(l.count)} {l.count === 1 ? "person" : "people"} · uploaded {fmtDate(l.createdAt)}
                    {l.fileName ? ` from ${l.fileName}` : ""}
                  </span>
                  {l.columns.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {l.columns.map((c) => (
                        <span key={c.key} title={c.label} className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                          {`{{${c.key}}}`}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <AdminButton
                    variant="ghost"
                    onClick={() => {
                      setListId(l.id)
                      setPage(1)
                    }}
                  >
                    See people
                  </AdminButton>
                  <AdminButton variant="ghost" onClick={() => setDeleting(l)}>
                    <Trash2 aria-hidden />
                    Delete
                  </AdminButton>
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard
        title={`People (${count(data.total)})`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <AdminSelect
              aria-label="Show list"
              value={listId}
              onChange={(e) => {
                setListId(e.target.value)
                setPage(1)
              }}
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            >
              <option value="">All lists</option>
              {data.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </AdminSelect>
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <AdminInput aria-label="Search leads" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-8" />
            </div>
          </div>
        }
      >
        {data.leads.length === 0 ? (
          <p className="text-caption text-muted-foreground">{search || listId ? "No one matches." : "No leads yet."}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={tableCls.wrap}>
              <table className={tableCls.table}>
                <thead>
                  <tr>
                    <th className={tableCls.th}>Person</th>
                    {shownColumns.map((c) => (
                      <th key={c.key} className={tableCls.th}>
                        {c.label}
                      </th>
                    ))}
                    <th className={tableCls.th}>Lists</th>
                    <th className={tableCls.th}>Added</th>
                    <th className={tableCls.th}>Emailed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((lead) => (
                    <tr key={lead.id} className={tableCls.row}>
                      <td className={tableCls.td}>
                        <span className="flex flex-col">
                          <span className="font-medium text-foreground">{lead.name ?? "—"}</span>
                          <span className="text-caption text-muted-foreground">{lead.email}</span>
                        </span>
                      </td>
                      {shownColumns.map((c) => (
                        <td key={c.key} className={`${tableCls.td} max-w-[12rem] truncate text-muted-foreground`}>
                          {lead.fields[c.key] ?? "—"}
                        </td>
                      ))}
                      <td className={`${tableCls.td} max-w-[14rem] truncate text-muted-foreground`}>{lead.lists.map((l) => l.name).join(", ") || "—"}</td>
                      <td className={`${tableCls.td} text-muted-foreground`}>{fmtDate(lead.createdAt)}</td>
                      <td className={tableCls.td}>
                        {lead.unsubscribedAt ? (
                          <span className="inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                            {STOPPED[lead.stopReason ?? "unsubscribed"] ?? "Unsubscribed"}
                          </span>
                        ) : lead.lastEmailedAt ? (
                          <span className="text-muted-foreground">
                            {lead.emailCount}× · last {fmtDate(lead.lastEmailedAt)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not yet</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2 text-caption text-muted-foreground">
                <AdminButton variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft aria-hidden />
                  Back
                </AdminButton>
                <span>
                  Page {page} of {pages}
                </span>
                <AdminButton variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                  <ChevronRight aria-hidden />
                </AdminButton>
              </div>
            )}
          </div>
        )}
      </AdminCard>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void deleteList(deleting)}
        loading={busy}
        title={`Delete "${deleting?.name}"?`}
        body="The list goes, and so do the leads only on it. Leads on other lists stay, and anyone who unsubscribed is kept so they're never emailed again. Campaigns already made keep their people."
        confirmLabel="Delete list"
      />
    </div>
  )
}
