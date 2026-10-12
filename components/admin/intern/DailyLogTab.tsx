"use client"

// Tab 2 — Daily Log: flat "Entry List" (inline edit/delete) and a "Daily Log"
// view grouped by date (see lib/groupEntries.ts). New entries are logged via
// the dedicated Daily Checklist page, not a modal here.
import { Fragment, useState } from "react"
import Link from "next/link"
import { ChevronDown, ClipboardList, Pencil, Trash2 } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, Modal, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { mergeDailyRecords } from "@/lib/groupEntries"
import type { AttendanceRecord, InternEntry } from "@/components/admin/intern/types"

const ATTENDANCE_STYLES: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-400",
  absent: "bg-red-500/15 text-red-400",
  "half-day": "bg-amber-500/15 text-amber-400",
  leave: "bg-blue-500/15 text-blue-400",
}

function AttendanceBadge({ status }: { status: string }) {
  const style = ATTENDANCE_STYLES[status] ?? "bg-[#2A2A2A] text-[#8A8A8A]"
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${style}`}>
      {status.replace("-", " ")}
    </span>
  )
}

function AttendanceLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-[#8A8A8A]">
      <span className="font-medium">Legend:</span>
      <AttendanceBadge status="present" />
      <AttendanceBadge status="absent" />
      <AttendanceBadge status="half-day" />
      <AttendanceBadge status="leave" />
    </div>
  )
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

export function DailyLogTab({
  internId,
  entries,
  attendance,
  onRefresh,
}: {
  internId: string
  entries: InternEntry[]
  attendance: AttendanceRecord[]
  onRefresh: () => void
}) {
  const { toast } = useToast()

  const [view, setView] = useState<"list" | "daily">("daily")
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const [editing, setEditing] = useState<InternEntry | null>(null)
  const [editPoints, setEditPoints] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editNote, setEditNote] = useState("")
  const [editBusy, setEditBusy] = useState(false)

  const [deleting, setDeleting] = useState<InternEntry | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

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
      const res = await fetch(`/api/admin/interns/${internId}/entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: n, category: editCategory.trim(), note: editNote.trim() || null }),
      })
      if (!res.ok) throw new Error()
      toast("Entry updated", "success")
      setEditing(null)
      onRefresh()
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
      const res = await fetch(`/api/admin/interns/${internId}/entries/${deleting.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast("Entry deleted", "success")
      setDeleting(null)
      onRefresh()
    } catch {
      toast("Failed to delete entry", "error")
    } finally {
      setDeleteBusy(false)
    }
  }

  const dailyGroups = mergeDailyRecords(entries, attendance)

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
            <Link href={`/admin/interns/${internId}/checklist`}>
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
          <div>
            <AttendanceLegend />
            <div className={tableCls.wrap}>
              <table className={tableCls.table}>
                <thead>
                  <tr>
                    <th className={tableCls.th}>Date</th>
                    <th className={tableCls.th}>Attendance</th>
                    <th className={tableCls.th}>Tasks Completed</th>
                    <th className={tableCls.th}>Total Points</th>
                    <th className={tableCls.th} />
                  </tr>
                </thead>
                <tbody>
                  {dailyGroups.length === 0 && (
                    <tr>
                      <td className={tableCls.td} colSpan={5}>
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
                            {g.attendance ? <AttendanceBadge status={g.attendance.status} /> : "—"}
                          </td>
                          <td className={tableCls.td}>
                            {g.taskNames.length === 0 ? (
                              "—"
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                                {g.taskNames.map((name) => (
                                  <TaskPill key={name} name={name} />
                                ))}
                              </div>
                            )}
                          </td>
                          <td
                            className={`${tableCls.td} tabular-nums font-semibold ${g.totalPoints < 0 ? "text-red-400" : "text-emerald-400"}`}
                          >
                            {g.entries.length === 0 ? "—" : `${g.totalPoints >= 0 ? "+" : ""}${g.totalPoints}`}
                          </td>
                          <td className={tableCls.td}>
                            <ChevronDown
                              className={`h-4 w-4 text-[#8A8A8A] transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={5} className="border-b border-[#232323] bg-[#141414] p-0">
                              {g.entries.length === 0 ? (
                                <p className="px-4 py-3 text-[12px] text-[#6A6A6A]">
                                  No point entries — attendance only.
                                </p>
                              ) : (
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
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
