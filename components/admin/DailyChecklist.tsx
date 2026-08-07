"use client"

// /admin/interns/[id]/checklist — Daily Checklist: check off active
// PredefinedTasks (with per-task quantity), add any number of ad-hoc custom
// entries, see a live running total, and save the whole day as one atomic
// batch via POST /api/admin/interns/[id]/checklist.
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, AdminSelect, ConfirmModal } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type Task = { id: string; name: string; points: number }
type CustomRow = { key: string; name: string; points: string; note: string }
type AttendanceInfo = { status: string; note: string | null; markedBy: string } | null

const ATTENDANCE_OPTIONS = [
  { value: "", label: "Not marked" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half-day", label: "Half-Day" },
  { value: "leave", label: "Leave" },
]

const dateInputCls =
  "h-9 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white outline-none focus:border-[#7C3AED] [color-scheme:dark]"

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDateLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

let rowKeySeq = 0
function newRowKey() {
  rowKeySeq += 1
  return `row-${rowKeySeq}`
}

export function DailyChecklist({ internId, internRole }: { internId: string; internRole?: string | null }) {
  const router = useRouter()
  const { toast } = useToast()

  const [date, setDate] = useState(todayStr())
  const [tasks, setTasks] = useState<Task[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [customRows, setCustomRows] = useState<CustomRow[]>([])

  const [existing, setExisting] = useState<{ count: number; totalPoints: number } | null>(null)
  const [existingAttendance, setExistingAttendance] = useState<AttendanceInfo>(null)
  const [attendanceStatus, setAttendanceStatus] = useState("")
  const [attendanceNote, setAttendanceNote] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // role-scoped: server returns tasks with role IS NULL (everyone) OR role
    // matching this intern's role, so an "HR Intern" doesn't see tasks meant
    // for other roles.
    const url = internRole
      ? `/api/admin/tasks?active=true&role=${encodeURIComponent(internRole)}`
      : "/api/admin/tasks?active=true"
    fetch(url)
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d: { tasks?: Task[] }) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
  }, [internRole])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/interns/${internId}/checklist?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            count: number
            totalPoints: number
            attendance: AttendanceInfo
          } | null,
        ) => {
          if (cancelled) return
          setExisting(d ? { count: d.count, totalPoints: d.totalPoints } : null)
          setExistingAttendance(d?.attendance ?? null)
          setAttendanceStatus(d?.attendance?.status ?? "")
          setAttendanceNote(d?.attendance?.note ?? "")
        },
      )
      .catch(() => {
        if (cancelled) return
        setExisting(null)
        setExistingAttendance(null)
        setAttendanceStatus("")
        setAttendanceNote("")
      })
    return () => {
      cancelled = true
    }
  }, [internId, date])

  const toggleTask = (taskId: string) => {
    setChecked((c) => ({ ...c, [taskId]: !c[taskId] }))
    if (!quantities[taskId]) setQuantities((q) => ({ ...q, [taskId]: "1" }))
  }

  const addCustomRow = () =>
    setCustomRows((rows) => [...rows, { key: newRowKey(), name: "", points: "", note: "" }])
  const removeCustomRow = (key: string) => setCustomRows((rows) => rows.filter((r) => r.key !== key))
  const updateCustomRow = (key: string, patch: Partial<CustomRow>) =>
    setCustomRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const checklistTotal = useMemo(
    () =>
      tasks.reduce((sum, t) => {
        if (!checked[t.id]) return sum
        const qty = Math.max(1, Math.round(Number(quantities[t.id]) || 1))
        return sum + t.points * qty
      }, 0),
    [tasks, checked, quantities],
  )

  const customTotal = useMemo(
    () =>
      customRows.reduce((sum, r) => {
        const n = Number(r.points)
        return sum + (r.name.trim() && Number.isInteger(n) ? n : 0)
      }, 0),
    [customRows],
  )

  const grandTotal = checklistTotal + customTotal
  const checkedCount = tasks.filter((t) => checked[t.id]).length
  const validCustomCount = customRows.filter((r) => r.name.trim() && Number.isInteger(Number(r.points))).length

  const buildPayload = () => {
    const taskEntries = tasks
      .filter((t) => checked[t.id])
      .map((t) => ({ taskId: t.id, quantity: Math.max(1, Math.round(Number(quantities[t.id]) || 1)) }))
    const customEntries = customRows
      .filter((r) => r.name.trim() && Number.isInteger(Number(r.points)))
      .map((r) => ({ name: r.name.trim(), points: Number(r.points), note: r.note.trim() || undefined }))
    const attendance = attendanceStatus ? { status: attendanceStatus, note: attendanceNote.trim() || undefined } : null
    return { date, taskEntries, customEntries, attendance }
  }

  const save = async () => {
    const payload = buildPayload()
    if (payload.taskEntries.length === 0 && payload.customEntries.length === 0 && !payload.attendance) {
      toast("Check at least one task, add a custom entry, or set attendance", "error")
      return
    }

    const hasInvalidCustomRow = customRows.some(
      (r) => (r.name.trim() || r.points.trim()) && !(r.name.trim() && Number.isInteger(Number(r.points))),
    )
    if (hasInvalidCustomRow) {
      toast("Every custom entry needs a name and whole-number points", "error")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/interns/${internId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast(`Saved ${data.count} ${data.count === 1 ? "entry" : "entries"} for ${date}`, "success")
      router.push(`/admin/interns/${internId}`)
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to save daily record", "error")
    } finally {
      setSaving(false)
    }
  }

  const onSaveClick = () => {
    if (existing && existing.count > 0) {
      setConfirmOpen(true)
      return
    }
    void save()
  }

  return (
    <div className="space-y-6">
      <AdminCard title="Date">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className={dateInputCls}
          />
          <span className="text-[12.5px] text-[#B0B0B0]">{fmtDateLabel(date)}</span>
        </div>
        {existing !== null && existing.count > 0 && (
          <p className="mt-3 text-[12px] text-amber-400">
            {existing.count} {existing.count === 1 ? "entry" : "entries"} already logged for this date
            ({existing.totalPoints >= 0 ? "+" : ""}
            {existing.totalPoints} pts). Saving again will ADD to that total.
          </p>
        )}
      </AdminCard>

      <AdminCard title="Attendance">
        {existingAttendance?.markedBy === "self" && (
          <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-blue-300">
            Intern applied for leave on this date
            {existingAttendance.note ? `: "${existingAttendance.note}"` : "."} This was self-service —
            use Revoke on the Leave Requests panel to undo it properly. Changing the status here won&apos;t
            update their leave balance.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <AdminSelect
            value={attendanceStatus}
            onChange={(e) => setAttendanceStatus(e.target.value)}
            className="w-40"
          >
            {ATTENDANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </AdminSelect>
          <AdminInput
            placeholder="Note (optional)"
            value={attendanceNote}
            onChange={(e) => setAttendanceNote(e.target.value)}
            disabled={!attendanceStatus}
            className="flex-1 min-w-[200px] disabled:opacity-40"
          />
        </div>
      </AdminCard>

      <AdminCard title="Tasks">
        {tasks.length === 0 ? (
          <p className="text-[12.5px] text-[#6A6A6A]">
            No active predefined tasks. Add some on the Manage Tasks page.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  checked[t.id] ? "border-[#7C3AED]/40 bg-[#7C3AED]/[0.06]" : "border-[#2A2A2A]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!checked[t.id]}
                  onChange={() => toggleTask(t.id)}
                  className="h-4 w-4 shrink-0 accent-[#7C3AED]"
                  aria-label={t.name}
                />
                <span className="flex-1 min-w-0 truncate text-[13px] text-white">{t.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-[#8A8A8A]">
                  {t.points >= 0 ? "+" : ""}
                  {t.points} pts each
                </span>
                <AdminInput
                  type="number"
                  min={1}
                  disabled={!checked[t.id]}
                  value={quantities[t.id] ?? "1"}
                  onChange={(e) => setQuantities((q) => ({ ...q, [t.id]: e.target.value }))}
                  className="w-16 shrink-0 disabled:opacity-40"
                  aria-label={`Quantity for ${t.name}`}
                />
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="Custom Tasks"
        actions={
          <AdminButton variant="secondary" onClick={addCustomRow}>
            <Plus className="h-3.5 w-3.5" />
            Add Custom Task
          </AdminButton>
        }
      >
        {customRows.length === 0 ? (
          <p className="text-[12.5px] text-[#6A6A6A]">
            Nothing not on the predefined list? Add it here — points are set manually.
          </p>
        ) : (
          <div className="space-y-2">
            {customRows.map((r) => (
              <div key={r.key} className="flex flex-wrap items-center gap-2">
                <AdminInput
                  placeholder="Task name"
                  value={r.name}
                  onChange={(e) => updateCustomRow(r.key, { name: e.target.value })}
                  className="flex-1 min-w-[160px]"
                />
                <AdminInput
                  type="number"
                  placeholder="Points"
                  value={r.points}
                  onChange={(e) => updateCustomRow(r.key, { points: e.target.value })}
                  className="w-24"
                />
                <AdminInput
                  placeholder="Note (optional)"
                  value={r.note}
                  onChange={(e) => updateCustomRow(r.key, { note: e.target.value })}
                  className="flex-1 min-w-[160px]"
                />
                <button
                  onClick={() => removeCustomRow(r.key)}
                  className="shrink-0 rounded-md p-2 text-[#8A8A8A] hover:bg-red-500/15 hover:text-red-400 transition-colors"
                  aria-label="Remove custom entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-5 py-4">
        <div>
          <div className="text-[11px] font-medium text-[#8A8A8A]">
            {checkedCount} task{checkedCount === 1 ? "" : "s"} · {validCustomCount} custom entr
            {validCustomCount === 1 ? "y" : "ies"}
            {attendanceStatus && ` · attendance: ${attendanceStatus}`}
          </div>
          <div
            className={`text-[22px] font-bold tabular-nums leading-tight ${grandTotal < 0 ? "text-red-400" : "text-white"}`}
          >
            {grandTotal >= 0 ? "+" : ""}
            {grandTotal} pts today
          </div>
        </div>
        <AdminButton loading={saving} onClick={onSaveClick}>
          Save Daily Record
        </AdminButton>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          void save()
        }}
        loading={saving}
        title="Entries already exist for this date"
        body={`Entries already exist for ${date}. Submitting again will ADD to that day's total, not replace it. Continue?`}
        confirmLabel="Add Anyway"
      />
    </div>
  )
}
