"use client"

// Full user-management table: client-side search / plan filter / column
// sorting / pagination / CSV export over GET /api/admin/users, plus per-row
// admin actions.
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  Coins,
  Crown,
  RotateCcw,
  StickyNote,
  Ban,
  FileText,
} from "lucide-react"
import {
  AdminButton,
  AdminInput,
  AdminSelect,
  ConfirmModal,
  Modal,
  PlanBadge,
  Spinner,
  fmtDate,
  tableCls,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

export type AdminUserRow = {
  id: string
  email: string
  name: string | null
  plan: "FREE" | "PRO"
  creditsUsed: number
  creditsTotal: number
  creditsRemaining: number
  postsCount: number
  createdAt: string
  lastActive: string
  suspendedAt: string | null
  adminNote: string | null
}

const PAGE_SIZE = 20

type SortKey =
  | "email"
  | "name"
  | "plan"
  | "creditsUsed"
  | "creditsRemaining"
  | "postsCount"
  | "createdAt"
  | "lastActive"

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "name", label: "Name" },
  { key: "plan", label: "Plan" },
  { key: "creditsUsed", label: "Credits Used" },
  { key: "creditsRemaining", label: "Credits Left" },
  { key: "postsCount", label: "Posts" },
  { key: "createdAt", label: "Signed Up" },
  { key: "lastActive", label: "Last Active" },
]

function exportCsv(rows: AdminUserRow[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const header = "Email,Name,Plan,Credits Used,Credits Remaining,Posts,Signed Up,Last Active,Suspended"
  const lines = rows.map((r) =>
    [
      esc(r.email),
      esc(r.name),
      r.plan,
      r.creditsUsed,
      r.creditsRemaining,
      r.postsCount,
      new Date(r.createdAt).toISOString(),
      new Date(r.lastActive).toISOString(),
      r.suspendedAt ? "yes" : "no",
    ].join(","),
  )
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `carouselabs-users-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function UsersTable() {
  const router = useRouter()
  const { toast } = useToast()
  const initialQuery = useSearchParams().get("q") ?? ""

  const [rows, setRows] = useState<AdminUserRow[] | null>(null)
  const [query, setQuery] = useState(initialQuery)
  const [planFilter, setPlanFilter] = useState<"ALL" | "FREE" | "PRO">("ALL")
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  // Row-action modal state
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [action, setAction] = useState<{ type: string; user: AdminUserRow } | null>(null)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.users)
    } catch {
      toast("Failed to load users", "error")
      setRows([])
    }
  }
  // `load` is also called after row actions to refresh, so it can't be
  // inlined as a .then() chain without duplicating fetch logic.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => void load(), [])

  // Close row menus on any outside click.
  useEffect(() => {
    const close = () => setMenuFor(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = query.trim().toLowerCase()
    let out = rows.filter(
      (r) =>
        (planFilter === "ALL" || r.plan === planFilter) &&
        (!q || r.email.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q)),
    )
    out = [...out].sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv))
      return sortDir === "asc" ? cmp : -cmp
    })
    return out
  }, [rows, query, planFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE)

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const runAction = async (fn: () => Promise<Response>, successMsg: string) => {
    setBusy(true)
    try {
      const res = await fn()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(successMsg, "success")
      setAction(null)
      setInput("")
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Action failed", "error")
    } finally {
      setBusy(false)
    }
  }

  const post = (path: string, body: unknown, method = "POST") =>
    fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

  if (rows === null) return <Spinner label="Loading users…" />

  const u = action?.user

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <AdminInput
          placeholder="Search by email or name…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
          className="w-72"
        />
        <AdminSelect
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value as typeof planFilter)
            setPage(1)
          }}
        >
          <option value="ALL">All plans</option>
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
        </AdminSelect>
        <span className="text-[12px] text-[#6A6A6A]">
          {filtered.length} user{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto">
          <AdminButton variant="secondary" onClick={() => exportCsv(filtered)}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </AdminButton>
        </div>
      </div>

      {/* Table */}
      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}></th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={tableCls.th}>
                  <button
                    onClick={() => onSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {c.label}
                    {sortKey === c.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-[#A78BFA]" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-[#A78BFA]" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
              <th className={tableCls.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td className={tableCls.td} colSpan={COLUMNS.length + 2}>
                  No users match
                </td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.id} className={tableCls.row}>
                <td className={tableCls.td}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[11px] font-bold text-[#A78BFA]">
                    {(r.name ?? r.email)[0]?.toUpperCase()}
                  </div>
                </td>
                <td className={tableCls.td}>
                  <Link href={`/admin/users/${r.id}`} className="text-[#A78BFA] hover:underline">
                    {r.email}
                  </Link>
                  {r.suspendedAt && (
                    <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                      SUSPENDED
                    </span>
                  )}
                </td>
                <td className={tableCls.td}>{r.name ?? "—"}</td>
                <td className={tableCls.td}>
                  <PlanBadge plan={r.plan} />
                </td>
                <td className={`${tableCls.td} tabular-nums`}>{r.creditsUsed}</td>
                <td className={`${tableCls.td} tabular-nums`}>{r.creditsRemaining}</td>
                <td className={`${tableCls.td} tabular-nums`}>{r.postsCount}</td>
                <td className={tableCls.td}>{fmtDate(r.createdAt)}</td>
                <td className={tableCls.td}>{fmtDate(r.lastActive)}</td>
                <td className={`${tableCls.td} relative`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuFor(menuFor === r.id ? null : r.id)
                    }}
                    className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-[#2A2A2A] hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuFor === r.id && (
                    <div
                      className="absolute right-4 top-10 z-50 w-52 rounded-lg border border-[#2A2A2A] bg-[#1F1F1F] py-1 shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        {
                          icon: Eye,
                          label: "View Full Profile",
                          onClick: () => router.push(`/admin/users/${r.id}`),
                        },
                        {
                          icon: Coins,
                          label: "Grant Credits",
                          onClick: () => {
                            setAction({ type: "grant", user: r })
                            setInput("100")
                          },
                        },
                        {
                          icon: Crown,
                          label: r.plan === "PRO" ? "Downgrade to Free" : "Upgrade to Pro",
                          onClick: () => setAction({ type: "plan", user: r }),
                        },
                        {
                          icon: RotateCcw,
                          label: "Reset Credits (1000)",
                          onClick: () => setAction({ type: "reset", user: r }),
                        },
                        {
                          icon: StickyNote,
                          label: "Add Note",
                          onClick: () => {
                            setAction({ type: "note", user: r })
                            setInput(r.adminNote ?? "")
                          },
                        },
                        {
                          icon: Ban,
                          label: r.suspendedAt ? "Unsuspend Account" : "Suspend Account",
                          onClick: () => setAction({ type: "suspend", user: r }),
                          danger: !r.suspendedAt,
                        },
                        {
                          icon: FileText,
                          label: "View All Posts",
                          onClick: () =>
                            router.push(`/admin/posts?search=${encodeURIComponent(r.email)}`),
                        },
                      ].map(({ icon: Icon, label, onClick, danger }) => (
                        <button
                          key={label}
                          onClick={() => {
                            setMenuFor(null)
                            onClick()
                          }}
                          className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] transition-colors hover:bg-[#2A2A2A] ${
                            danger ? "text-red-400" : "text-[#D0D0D0]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[12px] text-[#8A8A8A]">
        <span>
          Page {pageClamped} of {totalPages}
        </span>
        <div className="flex gap-2">
          <AdminButton
            variant="secondary"
            disabled={pageClamped <= 1}
            onClick={() => setPage(pageClamped - 1)}
          >
            Previous
          </AdminButton>
          <AdminButton
            variant="secondary"
            disabled={pageClamped >= totalPages}
            onClick={() => setPage(pageClamped + 1)}
          >
            Next
          </AdminButton>
        </div>
      </div>

      {/* Grant credits modal */}
      <Modal
        open={action?.type === "grant"}
        onClose={() => setAction(null)}
        title={`Grant credits to ${u?.email ?? ""}`}
      >
        <div className="space-y-3">
          <AdminInput
            type="number"
            min={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full"
            placeholder="Amount"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </AdminButton>
            <AdminButton
              loading={busy}
              onClick={() =>
                u &&
                runAction(
                  () =>
                    post(`/api/admin/users/${u.id}/credits`, {
                      action: "grant",
                      amount: Number(input),
                    }),
                  `Granted ${input} credits`,
                )
              }
            >
              Grant
            </AdminButton>
          </div>
        </div>
      </Modal>

      {/* Note modal */}
      <Modal
        open={action?.type === "note"}
        onClose={() => setAction(null)}
        title={`Admin note for ${u?.email ?? ""}`}
      >
        <div className="space-y-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
            placeholder="Internal note about this user…"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </AdminButton>
            <AdminButton
              loading={busy}
              onClick={() =>
                u &&
                runAction(
                  () => post(`/api/admin/users/${u.id}`, { adminNote: input }, "PATCH"),
                  "Note saved",
                )
              }
            >
              Save Note
            </AdminButton>
          </div>
        </div>
      </Modal>

      {/* Confirmations */}
      <ConfirmModal
        open={action?.type === "plan"}
        onClose={() => setAction(null)}
        loading={busy}
        title={u?.plan === "PRO" ? "Downgrade to Free?" : "Upgrade to Pro?"}
        body={
          u?.plan === "PRO"
            ? `${u?.email} will lose Pro access and go back to the free plan.`
            : `${u?.email} will get Pro with a fresh 1000-credit monthly allowance.`
        }
        confirmLabel={u?.plan === "PRO" ? "Downgrade" : "Upgrade"}
        onConfirm={() =>
          u &&
          runAction(
            () =>
              post(`/api/admin/users/${u.id}/plan`, { plan: u.plan === "PRO" ? "FREE" : "PRO" }),
            "Plan updated",
          )
        }
      />
      <ConfirmModal
        open={action?.type === "reset"}
        onClose={() => setAction(null)}
        loading={busy}
        title="Reset credits?"
        body={`${u?.email} will be reset to 0 used / 1000 total monthly credits.`}
        confirmLabel="Reset"
        onConfirm={() =>
          u &&
          runAction(() => post(`/api/admin/users/${u.id}/credits`, { action: "reset" }), "Credits reset")
        }
      />
      <ConfirmModal
        open={action?.type === "suspend"}
        onClose={() => setAction(null)}
        loading={busy}
        title={u?.suspendedAt ? "Unsuspend account?" : "Suspend account?"}
        body={
          u?.suspendedAt
            ? `${u?.email} will regain access.`
            : `${u?.email} will be flagged as suspended.`
        }
        confirmLabel={u?.suspendedAt ? "Unsuspend" : "Suspend"}
        onConfirm={() =>
          u &&
          runAction(
            () => post(`/api/admin/users/${u.id}/suspend`, { suspend: !u.suspendedAt }),
            u.suspendedAt ? "Account unsuspended" : "Account suspended",
          )
        }
      />
    </div>
  )
}
