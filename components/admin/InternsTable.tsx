"use client"

// /admin/interns — intern roster doubling as the leaderboard: ranked by
// all-time points descending (server-sorted), with medal badges for the top
// 3. "Add Intern" opens a create modal; clicking a row goes to the intern's
// detail page. Status filter narrows the list client-side (all rows are
// already fetched for the leaderboard ranking).
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, UserPlus, Megaphone } from "lucide-react"
import {
  AdminButton,
  AdminInput,
  AdminSelect,
  Modal,
  Spinner,
  fmtDate,
  tableCls,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type Progress = { percentComplete: number; daysRemaining: number; isCompleted: boolean }
type AttendanceFlag = "good" | "warning" | "critical"

type InternRow = {
  id: string
  name: string
  email: string
  role: string | null
  status: string
  active: boolean
  hasUnreadMessages: boolean
  totalPoints: number
  pointsToday: number
  pointsThisWeek: number
  lastEntryDate: string | null
  leaveUsed: number
  leaveAllowance: number
  progress: Progress
  attendanceFlag: AttendanceFlag
  consecutiveAbsences: number
}

const FLAG_DOT: Record<AttendanceFlag, string> = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
}
const FLAG_TITLE: Record<AttendanceFlag, string> = {
  good: "Attendance: good",
  warning: "Attendance: warning",
  critical: "Attendance: critical",
}

function AttendanceDot({ flag }: { flag: AttendanceFlag }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${FLAG_DOT[flag]}`}
      title={FLAG_TITLE[flag]}
      aria-label={FLAG_TITLE[flag]}
    />
  )
}

function UnreadMessageDot() {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#7C3AED]"
      title="Unread support message"
      aria-label="Unread support message"
    />
  )
}

const MEDALS = ["🥇", "🥈", "🥉"]

const STATUS_FILTERS = ["all", "active", "completed", "terminated"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  extended: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-blue-500/15 text-blue-400",
  terminated: "bg-red-500/15 text-red-400",
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-[#2A2A2A] text-[#8A8A8A]"
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${style}`}>
      {status}
    </span>
  )
}

function ProgressBar({ progress }: { progress: Progress }) {
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-[#2A2A2A]">
        <div
          className={`h-full rounded-full ${progress.isCompleted ? "bg-[#8A8A8A]" : "bg-[#7C3AED]"}`}
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>
      <span className="text-[11.5px] tabular-nums text-[#8A8A8A]">{progress.percentComplete}%</span>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank - 1]
  return medal ? (
    <span className="text-[16px] leading-none" aria-label={`Rank ${rank}`}>
      {medal}
    </span>
  ) : (
    <span className="text-[12.5px] font-semibold text-[#8A8A8A] tabular-nums">#{rank}</span>
  )
}

const DURATION_PRESETS = [1, 2, 3, 6]

export function InternsTable() {
  const router = useRouter()
  const { toast } = useToast()

  const [rows, setRows] = useState<InternRow[] | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")

  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState("3")
  const [customDuration, setCustomDuration] = useState("")
  const [busy, setBusy] = useState(false)

  const [deleting, setDeleting] = useState<InternRow | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/admin/interns")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.interns)
    } catch {
      toast("Failed to load interns", "error")
      setRows([])
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => void load(), [])

  const visibleRows = useMemo(() => {
    if (!rows) return rows
    if (filter === "all") return rows
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  const resetForm = () => {
    setName("")
    setEmail("")
    setPhone("")
    setRole("")
    setDepartment("")
    setPhotoUrl("")
    setJoinDate(new Date().toISOString().slice(0, 10))
    setDuration("3")
    setCustomDuration("")
  }

  const addIntern = async () => {
    if (!name.trim() || !email.trim()) {
      toast("Name and email are required", "error")
      return
    }
    const durationMonths = duration === "custom" ? Number(customDuration) : Number(duration)
    if (!Number.isInteger(durationMonths) || durationMonths < 1) {
      toast("Duration must be a whole number of months", "error")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/admin/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone.trim() || undefined,
          role: role.trim() || undefined,
          department: department.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          joinDate,
          durationMonths,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Intern added", "success")
      setAddOpen(false)
      resetForm()
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to add intern", "error")
    } finally {
      setBusy(false)
    }
  }

  const openDelete = (r: InternRow) => {
    setDeleting(r)
    setDeleteConfirmText("")
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${deleting.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error)
      toast(`${deleting.name} and all their data were deleted`, "success")
      setDeleting(null)
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to delete intern", "error")
    } finally {
      setDeleteBusy(false)
    }
  }

  if (rows === null) return <Spinner label="Loading interns…" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-[#6A6A6A]">
          {rows.length} intern{rows.length === 1 ? "" : "s"}
        </span>
        <div className="flex rounded-lg border border-[#2A2A2A] bg-[#141414] p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-[12px] font-semibold capitalize transition-colors ${
                filter === f ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <AdminButton variant="secondary" onClick={() => router.push("/admin/interns/broadcast")}>
            <Megaphone className="h-3.5 w-3.5" />
            Send Announcement
          </AdminButton>
          <AdminButton onClick={() => setAddOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Add Intern
          </AdminButton>
        </div>
      </div>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Rank</th>
              <th className={tableCls.th}>Name</th>
              <th className={tableCls.th}>Role</th>
              <th className={tableCls.th}>Status</th>
              <th className={tableCls.th}>Progress</th>
              <th className={tableCls.th}>Days Left</th>
              <th className={tableCls.th}>Total Points</th>
              <th className={tableCls.th}>Leave</th>
              <th className={tableCls.th}>Last Active</th>
              <th className={tableCls.th} />
            </tr>
          </thead>
          <tbody>
            {visibleRows && visibleRows.length === 0 && (
              <tr>
                <td className={tableCls.td} colSpan={10}>
                  No interns {filter === "all" ? "yet" : `with status "${filter}"`}
                </td>
              </tr>
            )}
            {visibleRows?.map((r, i) => (
              <tr
                key={r.id}
                className={`${tableCls.row} cursor-pointer`}
                onClick={() => router.push(`/admin/interns/${r.id}`)}
              >
                <td className={tableCls.td}>
                  <RankBadge rank={i + 1} />
                </td>
                <td className={tableCls.td}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[11px] font-bold text-[#A78BFA]">
                      {r.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <AttendanceDot flag={r.attendanceFlag} />
                        <span className="text-white">{r.name}</span>
                        {r.hasUnreadMessages && <UnreadMessageDot />}
                      </div>
                      <span className="text-[11px] text-[#8A8A8A]">{r.email}</span>
                      {r.consecutiveAbsences >= 3 && (
                        <span className="mt-0.5 inline-flex w-fit whitespace-nowrap rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          ⚠️ {r.consecutiveAbsences} days absent in a row
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`${tableCls.td} text-[#B0B0B0]`}>{r.role ?? "—"}</td>
                <td className={tableCls.td}>
                  <StatusBadge status={r.status} />
                </td>
                <td className={tableCls.td}>
                  <ProgressBar progress={r.progress} />
                </td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {r.progress.isCompleted ? "—" : r.progress.daysRemaining}
                </td>
                <td className={`${tableCls.td} tabular-nums font-semibold text-white`}>{r.totalPoints}</td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {r.leaveUsed}/{r.leaveAllowance} used
                </td>
                <td className={tableCls.td}>{r.lastEntryDate ? fmtDate(r.lastEntryDate) : "—"}</td>
                <td className={tableCls.td}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openDelete(r)
                    }}
                    className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-red-500/15 hover:text-red-400 transition-colors"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Intern">
        <div className="space-y-3">
          <AdminInput placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
          <AdminInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <AdminInput
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full"
          />
          <div className="flex gap-2">
            <AdminInput
              placeholder="Role / Position"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full"
            />
            <AdminInput
              placeholder="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full"
            />
          </div>
          <AdminInput
            placeholder="Photo URL (optional)"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full"
          />
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">Join Date</span>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white outline-none focus:border-[#7C3AED] [color-scheme:dark]"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">Duration</span>
              <AdminSelect value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full">
                {DURATION_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m} month{m === 1 ? "" : "s"}
                  </option>
                ))}
                <option value="custom">Custom…</option>
              </AdminSelect>
            </label>
          </div>
          {duration === "custom" && (
            <AdminInput
              type="number"
              min={1}
              placeholder="Custom duration (months)"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className="w-full"
            />
          )}
          <p className="text-[11px] text-[#6A6A6A]">
            Their account links automatically the first time they sign in with this email.
          </p>
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton loading={busy} onClick={addIntern}>
              Add Intern
            </AdminButton>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete intern permanently?">
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-[#B0B0B0]">
            This permanently deletes <span className="font-semibold text-white">{deleting?.name}</span> and{" "}
            <span className="font-semibold text-white">all</span> of their data — point entries, attendance,
            leave requests, notes, and extension history. This cannot be undone.
          </p>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">
              Type <span className="font-semibold text-white">{deleting?.name}</span> to confirm
            </span>
            <AdminInput
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleting?.name}
              className="w-full"
            />
          </label>
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </AdminButton>
            <AdminButton
              variant="danger"
              loading={deleteBusy}
              disabled={deleteConfirmText !== deleting?.name}
              onClick={confirmDelete}
            >
              Delete Permanently
            </AdminButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
