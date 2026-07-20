"use client"

// /admin/audit-logs — paginated, filterable trail of every mutating admin
// action (/api/admin/audit-logs). Color-coded action badges by category.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { AdminAuditAction } from "@/lib/auditLog"
import { AdminButton, AdminInput, AdminSelect, Spinner, fmtDateTime, tableCls } from "@/components/admin/ui"
import { exportToCSV } from "@/lib/adminExport"
import { useToast } from "@/components/admin/Toast"

type AuditLogRow = {
  id: string
  adminEmail: string
  action: string
  targetUserId: string | null
  targetEmail: string | null
  details: string
  ipAddress: string | null
  createdAt: string
}

type AuditLogsResponse = {
  total: number
  page: number
  totalPages: number
  logs: AuditLogRow[]
}

const ACTIONS: AdminAuditAction[] = [
  "GRANT_CREDITS",
  "SET_CREDITS",
  "RESET_CREDITS",
  "BULK_GRANT_CREDITS",
  "RESET_ALL_PRO_CREDITS",
  "CHANGE_PLAN",
  "BULK_CHANGE_PLAN",
  "SUSPEND_USER",
  "UNSUSPEND_USER",
  "BULK_SUSPEND_USER",
  "UPDATE_NOTE",
  "UPDATE_SETTINGS",
  "SEND_BROADCAST",
]

// green = grant, red = suspend, blue = plan change, yellow = settings,
// violet = everything else (notes, broadcasts, resets).
const ACTION_STYLES: Record<string, string> = {
  GRANT_CREDITS: "bg-emerald-500/15 text-emerald-400",
  BULK_GRANT_CREDITS: "bg-emerald-500/15 text-emerald-400",
  SET_CREDITS: "bg-emerald-500/15 text-emerald-400",
  RESET_CREDITS: "bg-[#7C3AED]/15 text-[#A78BFA]",
  RESET_ALL_PRO_CREDITS: "bg-[#7C3AED]/15 text-[#A78BFA]",
  CHANGE_PLAN: "bg-sky-500/15 text-sky-400",
  BULK_CHANGE_PLAN: "bg-sky-500/15 text-sky-400",
  SUSPEND_USER: "bg-red-500/15 text-red-400",
  BULK_SUSPEND_USER: "bg-red-500/15 text-red-400",
  UNSUSPEND_USER: "bg-emerald-500/15 text-emerald-400",
  UPDATE_NOTE: "bg-[#7C3AED]/15 text-[#A78BFA]",
  UPDATE_SETTINGS: "bg-amber-500/15 text-amber-400",
  SEND_BROADCAST: "bg-amber-500/15 text-amber-400",
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACTION_STYLES[action] ?? "bg-[#2A2A2A] text-[#B0B0B0]"}`}
    >
      {action.replaceAll("_", " ")}
    </span>
  )
}

export function AuditLogsTable() {
  const { toast } = useToast()
  const [action, setAction] = useState("")
  const [email, setEmail] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditLogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" })
      if (action) params.set("action", action)
      if (email.trim()) params.set("email", email.trim())
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast("Failed to load audit logs", "error")
    } finally {
      setLoading(false)
    }
  }, [page, action, email, from, to, toast])

  useEffect(() => {
    const t = setTimeout(load, email ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, email])

  const exportAll = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ page: "1", limit: "200" })
      if (action) params.set("action", action)
      if (email.trim()) params.set("email", email.trim())
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      const res = await fetch(`/api/admin/audit-logs?${params}`)
      if (!res.ok) throw new Error()
      const first: AuditLogsResponse = await res.json()
      const all = [...first.logs]
      for (let p = 2; p <= first.totalPages; p++) {
        params.set("page", String(p))
        const r = await fetch(`/api/admin/audit-logs?${params}`)
        if (r.ok) all.push(...((await r.json()) as AuditLogsResponse).logs)
      }
      exportToCSV(
        all.map((l) => ({
          Timestamp: new Date(l.createdAt).toISOString(),
          Admin: l.adminEmail,
          Action: l.action,
          TargetEmail: l.targetEmail ?? "",
          Details: l.details,
          IP: l.ipAddress ?? "",
        })),
        "carouselabs-audit-logs",
      )
    } catch {
      toast("Export failed", "error")
    } finally {
      setExporting(false)
    }
  }

  const dateInputCls =
    "h-9 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white outline-none focus:border-[#7C3AED] [color-scheme:dark]"

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <AdminInput
          placeholder="Search by target or admin email…"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setPage(1)
          }}
          className="w-72"
        />
        <AdminSelect
          value={action}
          onChange={(e) => {
            setAction(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replaceAll("_", " ")}
            </option>
          ))}
        </AdminSelect>
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            setPage(1)
          }}
          className={dateInputCls}
        />
        <span className="text-[12px] text-[#6A6A6A]">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            setPage(1)
          }}
          className={dateInputCls}
        />
        {data && <span className="text-[12px] text-[#6A6A6A]">{data.total} entries</span>}
        <div className="ml-auto">
          <AdminButton variant="secondary" onClick={exportAll} loading={exporting}>
            Export CSV
          </AdminButton>
        </div>
      </div>

      {loading && !data ? (
        <Spinner label="Loading audit logs…" />
      ) : (
        <div className={`${tableCls.wrap} ${loading ? "opacity-60" : ""}`}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Timestamp</th>
                <th className={tableCls.th}>Admin</th>
                <th className={tableCls.th}>Action</th>
                <th className={tableCls.th}>Target User</th>
                <th className={tableCls.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.length === 0 && (
                <tr>
                  <td className={tableCls.td} colSpan={5}>
                    No matching audit log entries
                  </td>
                </tr>
              )}
              {data?.logs.map((l) => (
                <tr key={l.id} className={tableCls.row}>
                  <td className={tableCls.td}>{fmtDateTime(l.createdAt)}</td>
                  <td className={tableCls.td}>{l.adminEmail}</td>
                  <td className={tableCls.td}>
                    <ActionBadge action={l.action} />
                  </td>
                  <td className={tableCls.td}>
                    {l.targetUserId ? (
                      <Link href={`/admin/users/${l.targetUserId}`} className="text-[#A78BFA] hover:underline">
                        {l.targetEmail ?? l.targetUserId}
                      </Link>
                    ) : (
                      (l.targetEmail ?? "—")
                    )}
                  </td>
                  <td className={`${tableCls.td} max-w-[420px] truncate text-[#8A8A8A]`} title={l.details}>
                    {l.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between text-[12px] text-[#8A8A8A]">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <AdminButton variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </AdminButton>
            <AdminButton
              variant="secondary"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  )
}
