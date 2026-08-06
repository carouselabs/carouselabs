"use client"

// /admin/interns/[id] — interactive half of the intern detail page: active
// toggle, points-over-time chart, and entries in two views — a flat "Entry
// List" (with inline edit/delete) and a "Daily Log" grouped by date (see
// lib/groupEntries.ts). New entries are now logged via the dedicated Daily
// Checklist page (/admin/interns/[id]/checklist), not a modal here.
import { Fragment, useState } from "react"
import Link from "next/link"
import { ChevronDown, ClipboardList, Pencil, Trash2 } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  ConfirmModal,
  Modal,
  StatCard,
  fmtDate,
  tableCls,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { AdminLineChart, CHART_COLORS } from "@/components/admin/charts"
import { groupEntriesByDate } from "@/lib/groupEntries"

export type InternEntry = {
  id: string
  date: string
  points: number
  category: string
  note: string | null
  source: string
  addedBy: string
  isPredefinedTask: boolean
}

export type InternSummary = {
  id: string
  name: string
  email: string
  active: boolean
  totalPoints: number
  pointsToday: number
  pointsThisWeek: number
}

function chartData(entries: InternEntry[]) {
  const byDay = new Map<string, number>()
  for (const e of entries) {
    const day = e.date.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + e.points)
  }
  const days = [...byDay.keys()].sort()
  let running = 0
  return days.map((day) => {
    running += byDay.get(day)!
    return { date: day, total: running }
  })
}

function TypeBadge({ isTask }: { isTask: boolean }) {
  return isTask ? (
    <span className="inline-flex rounded-full bg-[#7C3AED]/15 px-2 py-0.5 text-[10px] font-semibold text-[#A78BFA]">
      TASK
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10px] font-medium text-[#8A8A8A]">
      CUSTOM
    </span>
  )
}

function TaskPill({ name }: { name: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[10.5px] font-medium text-[#D0D0D0]">
      {name}
    </span>
  )
}

export function InternDetail({
  intern: initialIntern,
  entries: initialEntries,
}: {
  intern: InternSummary
  entries: InternEntry[]
}) {
  const { toast } = useToast()
  const [intern, setIntern] = useState(initialIntern)
  const [entries, setEntries] = useState(initialEntries)
  const [togglingActive, setTogglingActive] = useState(false)

  const [view, setView] = useState<"list" | "daily">("daily")
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const [editing, setEditing] = useState<InternEntry | null>(null)
  const [editPoints, setEditPoints] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editNote, setEditNote] = useState("")
  const [editBusy, setEditBusy] = useState(false)

  const [deleting, setDeleting] = useState<InternEntry | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const refresh = async () => {
    const res = await fetch(`/api/admin/interns/${intern.id}`)
    if (!res.ok) return
    const data = await res.json()
    setIntern(data.intern)
    setEntries(data.entries)
  }

  const toggleActive = async () => {
    setTogglingActive(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !intern.active }),
      })
      if (!res.ok) throw new Error()
      setIntern((s) => ({ ...s, active: !s.active }))
      toast(intern.active ? "Marked inactive" : "Marked active", "success")
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setTogglingActive(false)
    }
  }

  const openEdit = (entry: InternEntry) => {
    setEditing(entry)
    setEditPoints(String(entry.points))
    setEditCategory(entry.category)
    setEditNote(entry.note ?? "")
  }

  const saveEdit = async () => {
    if (!editing) return
    const n = Number(editPoints)
    if (!Number.isInteger(n)) {
      toast("Points must be a whole number", "error")
      return
    }
    if (!editCategory.trim()) {
      toast("Category is required", "error")
      return
    }
    setEditBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}/entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: n, category: editCategory.trim(), note: editNote.trim() || null }),
      })
      if (!res.ok) throw new Error()
      toast("Entry updated", "success")
      setEditing(null)
      await refresh()
    } catch {
      toast("Failed to update entry", "error")
    } finally {
      setEditBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}/entries/${deleting.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      toast("Entry deleted", "success")
      setDeleting(null)
      await refresh()
    } catch {
      toast("Failed to delete entry", "error")
    } finally {
      setDeleteBusy(false)
    }
  }

  const series = chartData(entries)
  const dailyGroups = groupEntriesByDate(entries)

  const entryActions = (e: InternEntry) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => openEdit(e)}
        className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-[#2A2A2A] hover:text-white transition-colors"
        aria-label="Edit entry"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setDeleting(e)}
        className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-red-500/15 hover:text-red-400 transition-colors"
        aria-label="Delete entry"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Points" value={intern.totalPoints} />
        <StatCard label="This Week" value={intern.pointsThisWeek} />
        <StatCard label="Today" value={intern.pointsToday} />
        <StatCard
          label="Status"
          value={
            <button
              onClick={toggleActive}
              disabled={togglingActive}
              className={`text-[13px] font-semibold ${intern.active ? "text-emerald-400" : "text-[#8A8A8A]"} disabled:opacity-50`}
            >
              {intern.active ? "Active" : "Inactive"}
            </button>
          }
          hint="Click to toggle"
        />
      </div>

      <AdminCard title="Points Over Time">
        {series.length === 0 ? (
          <p className="text-[12.5px] text-[#6A6A6A]">No entries yet.</p>
        ) : (
          <AdminLineChart
            data={series}
            xKey="date"
            series={[{ key: "total", label: "Cumulative points", color: CHART_COLORS.violet }]}
          />
        )}
      </AdminCard>

      <AdminCard
        title={view === "daily" ? `Daily Log (${dailyGroups.length})` : `Entry List (${entries.length})`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[#2A2A2A] bg-[#141414] p-1">
              {(["daily", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1 text-[12px] font-semibold transition-colors ${
                    view === v ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:text-white"
                  }`}
                >
                  {v === "daily" ? "Daily Log" : "Entry List"}
                </button>
              ))}
            </div>
            <Link href={`/admin/interns/${intern.id}/checklist`}>
              <AdminButton>
                <ClipboardList className="h-3.5 w-3.5" />
                Daily Checklist
              </AdminButton>
            </Link>
          </div>
        }
      >
        {view === "list" ? (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Date</th>
                  <th className={tableCls.th}>Points</th>
                  <th className={tableCls.th}>Category</th>
                  <th className={tableCls.th}>Type</th>
                  <th className={tableCls.th}>Note</th>
                  <th className={tableCls.th}>Source</th>
                  <th className={tableCls.th}>Added By</th>
                  <th className={tableCls.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={8}>
                      No entries yet
                    </td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className={tableCls.row}>
                    <td className={tableCls.td}>{fmtDate(e.date)}</td>
                    <td
                      className={`${tableCls.td} tabular-nums ${e.points < 0 ? "text-red-400" : "text-emerald-400"}`}
                    >
                      {e.points >= 0 ? "+" : ""}
                      {e.points}
                    </td>
                    <td className={tableCls.td}>{e.category}</td>
                    <td className={tableCls.td}>
                      <TypeBadge isTask={e.isPredefinedTask} />
                    </td>
                    <td className={`${tableCls.td} max-w-[240px] truncate text-[#8A8A8A]`}>{e.note ?? "—"}</td>
                    <td className={tableCls.td}>{e.source}</td>
                    <td className={`${tableCls.td} text-[#8A8A8A]`}>{e.addedBy}</td>
                    <td className={tableCls.td}>{entryActions(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Date</th>
                  <th className={tableCls.th}>Tasks Completed</th>
                  <th className={tableCls.th}>Total Points</th>
                  <th className={tableCls.th} />
                </tr>
              </thead>
              <tbody>
                {dailyGroups.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={4}>
                      No entries yet
                    </td>
                  </tr>
                )}
                {dailyGroups.map((g) => {
                  const isOpen = expandedDate === g.date
                  return (
                    <Fragment key={g.date}>
                      <tr
                        className={`${tableCls.row} cursor-pointer`}
                        onClick={() => setExpandedDate(isOpen ? null : g.date)}
                      >
                        <td className={tableCls.td}>{fmtDate(g.date)}</td>
                        <td className={tableCls.td}>
                          <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                            {g.taskNames.map((name) => (
                              <TaskPill key={name} name={name} />
                            ))}
                          </div>
                        </td>
                        <td
                          className={`${tableCls.td} tabular-nums font-semibold ${g.totalPoints < 0 ? "text-red-400" : "text-emerald-400"}`}
                        >
                          {g.totalPoints >= 0 ? "+" : ""}
                          {g.totalPoints}
                        </td>
                        <td className={tableCls.td}>
                          <ChevronDown
                            className={`h-4 w-4 text-[#8A8A8A] transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={4} className="border-b border-[#232323] bg-[#141414] p-0">
                            <table className="w-full text-left text-[12.5px]">
                              <tbody>
                                {g.entries.map((e) => (
                                  <tr key={e.id} className="border-b border-[#232323] last:border-0">
                                    <td
                                      className={`px-4 py-2.5 tabular-nums ${e.points < 0 ? "text-red-400" : "text-emerald-400"}`}
                                    >
                                      {e.points >= 0 ? "+" : ""}
                                      {e.points}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#D0D0D0]">{e.category}</td>
                                    <td className="px-4 py-2.5">
                                      <TypeBadge isTask={e.isPredefinedTask} />
                                    </td>
                                    <td className="max-w-[220px] truncate px-4 py-2.5 text-[#8A8A8A]">
                                      {e.note ?? "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-[#8A8A8A]">{e.addedBy}</td>
                                    <td className="px-4 py-2.5">{entryActions(e)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Edit entry modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit entry">
        <div className="space-y-3">
          <AdminInput
            type="number"
            placeholder="Points"
            value={editPoints}
            onChange={(e) => setEditPoints(e.target.value)}
            className="w-full"
          />
          <AdminInput
            placeholder="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            className="w-full"
          />
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            rows={3}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </AdminButton>
            <AdminButton loading={editBusy} onClick={saveEdit}>
              Save
            </AdminButton>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete entry?"
        body={
          deleting
            ? `This removes the ${deleting.points >= 0 ? "+" : ""}${deleting.points} pt "${deleting.category}" entry permanently.`
            : ""
        }
        confirmLabel="Delete"
      />
    </div>
  )
}
