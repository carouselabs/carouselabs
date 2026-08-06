"use client"

// /admin/interns/[id] — interactive half of the intern detail page: active
// toggle, add-entry form (Quick Task from PredefinedTask, or Custom Task with
// admin-set points), entries table with inline edit/delete, and the
// points-over-time chart. Server component passes the initial fetch; this
// component owns all mutation + refresh from here on.
import { useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  ConfirmModal,
  Modal,
  StatCard,
  fmtDate,
  tableCls,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { AdminLineChart, CHART_COLORS } from "@/components/admin/charts"

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

type Task = { id: string; name: string; points: number }

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

  const [tasks, setTasks] = useState<Task[]>([])
  useEffect(() => {
    fetch("/api/admin/tasks?active=true")
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d: { tasks?: Task[] }) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
  }, [])

  const [addOpen, setAddOpen] = useState(false)
  const [mode, setMode] = useState<"quick" | "custom">("quick")
  const [taskId, setTaskId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [customName, setCustomName] = useState("")
  const [customPoints, setCustomPoints] = useState("")
  const [note, setNote] = useState("")
  const [addBusy, setAddBusy] = useState(false)

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

  const resetAddForm = () => {
    setMode("quick")
    setTaskId("")
    setQuantity("1")
    setCustomName("")
    setCustomPoints("")
    setNote("")
  }

  const selectedTask = tasks.find((t) => t.id === taskId)
  const quickQty = Math.max(1, Math.round(Number(quantity) || 1))
  const quickPointsPreview = selectedTask ? selectedTask.points * quickQty : null

  const addEntry = async () => {
    let body: { points: number; category: string; note?: string }

    if (mode === "quick") {
      if (!selectedTask) {
        toast("Select a task", "error")
        return
      }
      const noteParts = [note.trim(), quickQty > 1 ? `×${quickQty}` : ""].filter(Boolean)
      body = {
        points: selectedTask.points * quickQty,
        category: selectedTask.name,
        note: noteParts.join(" ") || undefined,
      }
    } else {
      const n = Number(customPoints)
      if (!customName.trim()) {
        toast("Task name is required", "error")
        return
      }
      if (!Number.isInteger(n)) {
        toast("Points must be a whole number", "error")
        return
      }
      body = { points: n, category: customName.trim(), note: note.trim() || undefined }
    }

    setAddBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Entry added", "success")
      setAddOpen(false)
      resetAddForm()
      await refresh()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to add entry", "error")
    } finally {
      setAddBusy(false)
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
        title={`Entry History (${entries.length})`}
        actions={<AdminButton onClick={() => setAddOpen(true)}>Add Entry</AdminButton>}
      >
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
                  <td className={tableCls.td}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Add entry modal */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          resetAddForm()
        }}
        title={`Add entry for ${intern.name}`}
      >
        <div className="space-y-4">
          <div className="flex rounded-lg border border-[#2A2A2A] bg-[#141414] p-1">
            {(["quick", "custom"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 text-[12.5px] font-semibold transition-colors ${
                  mode === m ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:text-white"
                }`}
              >
                {m === "quick" ? "Quick Task" : "Custom Task"}
              </button>
            ))}
          </div>

          {mode === "quick" ? (
            <div className="space-y-3">
              <AdminSelect value={taskId} onChange={(e) => setTaskId(e.target.value)} className="w-full">
                <option value="">Select a task…</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.points >= 0 ? "+" : ""}
                    {t.points} pts)
                  </option>
                ))}
              </AdminSelect>
              <div className="flex items-center gap-3">
                <AdminInput
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-24"
                  aria-label="Quantity"
                />
                <span className="text-[12px] text-[#6A6A6A]">
                  {quickPointsPreview !== null
                    ? `= ${quickPointsPreview >= 0 ? "+" : ""}${quickPointsPreview} pts total`
                    : "times done today"}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AdminInput
                placeholder="Task name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full"
              />
              <AdminInput
                type="number"
                placeholder="Points (can be negative)"
                value={customPoints}
                onChange={(e) => setCustomPoints(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />

          <div className="flex justify-end gap-2">
            <AdminButton
              variant="secondary"
              onClick={() => {
                setAddOpen(false)
                resetAddForm()
              }}
            >
              Cancel
            </AdminButton>
            <AdminButton loading={addBusy} onClick={addEntry}>
              Add Entry
            </AdminButton>
          </div>
        </div>
      </Modal>

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
