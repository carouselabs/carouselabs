"use client"

// Tab 1 — Overview: profile card, internship progress, quick stats, and the
// extend / complete / terminate actions.
import { useState } from "react"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { AdminButton, AdminCard, AdminSelect, ConfirmModal, Modal, StatCard, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"
import { formatExtensionAmount, formatInternshipDuration } from "@/lib/internDuration"
import type { AttendanceFlag, AttendanceRecord, InternExtensionT, InternProfile } from "@/components/admin/intern/types"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  extended: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-blue-500/15 text-blue-400",
  terminated: "bg-red-500/15 text-red-400",
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-[#2A2A2A] text-[#8A8A8A]"
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase ${style}`}>
      {status}
    </span>
  )
}

function attendanceCounts(attendance: AttendanceRecord[]) {
  return {
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    halfDay: attendance.filter((a) => a.status === "half-day").length,
  }
}

function attendanceRate(attendance: AttendanceRecord[]): string {
  const relevant = attendance.filter((a) => a.status !== "leave")
  if (relevant.length === 0) return "—"
  const score = relevant.reduce((sum, a) => {
    if (a.status === "present") return sum + 1
    if (a.status === "half-day") return sum + 0.5
    return sum
  }, 0)
  return `${Math.round((score / relevant.length) * 100)}%`
}

const FLAG_META: Record<AttendanceFlag, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  good: { label: "Good", color: "text-emerald-400", bg: "border-emerald-500/30 bg-emerald-500/[0.06]", icon: CheckCircle2 },
  warning: { label: "Warning", color: "text-amber-400", bg: "border-amber-500/30 bg-amber-500/[0.06]", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-400", bg: "border-red-500/30 bg-red-500/[0.06]", icon: XCircle },
}

function AttendanceFlagCard({ intern, attendance }: { intern: InternProfile; attendance: AttendanceRecord[] }) {
  const { present, absent, halfDay } = attendanceCounts(attendance)
  const total = present + absent + halfDay
  const meta = FLAG_META[intern.attendanceFlag]
  const Icon = meta.icon
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${meta.bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${meta.color}`} />
      <div>
        <div className={`text-[13px] font-semibold ${meta.color}`}>Attendance: {meta.label}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#B0B0B0]">
          {total === 0
            ? "No attendance records yet."
            : `Based on ${present} present, ${absent} absent, and ${halfDay} half-day record${
                total === 1 ? "" : "s"
              } (${attendanceRate(attendance)} attendance rate).`}
          {intern.consecutiveAbsences >= 3 && (
            <span className="ml-1 font-semibold text-red-400">
              ⚠️ {intern.consecutiveAbsences} days absent in a row.
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

const DURATION_PRESETS = [1, 2, 3, 6]

export function OverviewTab({
  intern,
  attendance,
  extensions,
  onRefresh,
}: {
  intern: InternProfile
  attendance: AttendanceRecord[]
  extensions: InternExtensionT[]
  onRefresh: () => void
}) {
  const { toast } = useToast()

  const [extendOpen, setExtendOpen] = useState(false)
  const [extendDirection, setExtendDirection] = useState<"extend" | "reduce">("extend")
  const [extendMode, setExtendMode] = useState<"months" | "days">("months")
  const [extendMonths, setExtendMonths] = useState("1")
  const [extendDays, setExtendDays] = useState("5")
  const [extendReason, setExtendReason] = useState("")
  const [extendBusy, setExtendBusy] = useState(false)

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeBusy, setCompleteBusy] = useState(false)

  const [terminateOpen, setTerminateOpen] = useState(false)
  const [terminateReason, setTerminateReason] = useState("")
  const [terminateBusy, setTerminateBusy] = useState(false)

  const isEnded = intern.status === "completed" || intern.status === "terminated"

  const submitExtend = async () => {
    const sign = extendDirection === "extend" ? 1 : -1
    let body: { months: number; reason?: string } | { days: number; reason?: string }
    let successLabel: string

    if (extendMode === "months") {
      const months = Number(extendMonths)
      if (!Number.isInteger(months) || months < 1) {
        toast("Enter a whole number of months", "error")
        return
      }
      body = { months: months * sign, reason: extendReason.trim() || undefined }
      successLabel = `${months} month${months === 1 ? "" : "s"}`
    } else {
      const days = Number(extendDays)
      if (!Number.isInteger(days) || days < 1) {
        toast("Enter a whole number of days", "error")
        return
      }
      body = { days: days * sign, reason: extendReason.trim() || undefined }
      successLabel = `${days} day${days === 1 ? "" : "s"}`
    }

    setExtendBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error)
      toast(
        `${extendDirection === "extend" ? "Extended" : "Reduced"} by ${successLabel}`,
        "success",
      )
      setExtendOpen(false)
      setExtendDirection("extend")
      setExtendMode("months")
      setExtendMonths("1")
      setExtendDays("5")
      setExtendReason("")
      onRefresh()
    } catch (e) {
      toast(
        e instanceof Error && e.message
          ? e.message
          : `Failed to ${extendDirection === "extend" ? "extend" : "reduce"} internship`,
        "error",
      )
    } finally {
      setExtendBusy(false)
    }
  }

  const submitComplete = async () => {
    setCompleteBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      if (!res.ok) throw new Error()
      toast("Marked as completed", "success")
      setCompleteOpen(false)
      onRefresh()
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setCompleteBusy(false)
    }
  }

  const submitTerminate = async () => {
    if (!terminateReason.trim()) {
      toast("A reason is required to terminate", "error")
      return
    }
    setTerminateBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${intern.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "terminated", reason: terminateReason.trim() }),
      })
      if (!res.ok) throw new Error()
      toast("Internship terminated", "success")
      setTerminateOpen(false)
      setTerminateReason("")
      onRefresh()
    } catch {
      toast("Failed to update status", "error")
    } finally {
      setTerminateBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {intern.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={intern.photoUrl}
                alt={intern.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[20px] font-bold text-[#A78BFA]">
                {intern.name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[17px] font-bold text-white">{intern.name}</h2>
                <StatusBadge status={intern.status} />
              </div>
              <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">{intern.email}</p>
              <p className="mt-1 text-[12px] text-[#6A6A6A]">
                {[intern.role, intern.department].filter(Boolean).join(" · ") || "No role/department set"}
                {intern.phone && ` · ${intern.phone}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <AdminButton variant="secondary" onClick={() => setExtendOpen(true)}>
              Extend / Reduce
            </AdminButton>
            {!isEnded && (
              <>
                <AdminButton variant="secondary" onClick={() => setCompleteOpen(true)}>
                  Mark as Completed
                </AdminButton>
                <AdminButton variant="danger" onClick={() => setTerminateOpen(true)}>
                  Terminate
                </AdminButton>
              </>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[12px] text-[#8A8A8A]">
            <span>
              {fmtDate(intern.joinDate)} → {fmtDate(intern.endDate)}
            </span>
            <span>
              {intern.progress.isCompleted
                ? "Internship period ended"
                : `${intern.progress.daysRemaining} day${intern.progress.daysRemaining === 1 ? "" : "s"} remaining`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#2A2A2A]">
            <div
              className={`h-full rounded-full ${intern.progress.isCompleted ? "bg-[#8A8A8A]" : "bg-[#7C3AED]"}`}
              style={{ width: `${intern.progress.percentComplete}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[11px] text-[#6A6A6A]">
            {intern.progress.percentComplete}% complete ·{" "}
            {formatInternshipDuration(new Date(intern.joinDate), new Date(intern.endDate))} total
          </div>
        </div>
      </AdminCard>

      <AttendanceFlagCard intern={intern} attendance={attendance} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Points" value={intern.totalPoints} />
        <StatCard label="Attendance Rate" value={attendanceRate(attendance)} />
        <StatCard
          label="Leave Used"
          value={`${intern.leaveBalance.used}/${intern.leaveBalance.total}`}
          hint={`${intern.leaveBalance.remaining} remaining`}
        />
        <StatCard label="Leaderboard Rank" value={intern.rank ? `#${intern.rank}` : "—"} />
      </div>

      {extensions.length > 0 && (
        <AdminCard title={`Extension History (${extensions.length})`}>
          <ul className="space-y-2.5">
            {extensions.map((x) => (
              <li key={x.id} className="text-[12.5px] text-[#B0B0B0]">
                <span className="font-semibold text-white">
                  {x.addedDays >= 0 ? "+" : "−"}
                  {formatExtensionAmount(x.addedDays)}
                </span>{" "}
                — {fmtDate(x.previousEndDate)} → {fmtDate(x.newEndDate)}
                {x.reason && <span className="text-[#8A8A8A]"> · &ldquo;{x.reason}&rdquo;</span>}
                <span className="text-[#6A6A6A]">
                  {" "}
                  · by {x.extendedBy} on {fmtDate(x.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      {/* Extend / reduce modal */}
      <Modal
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title={extendDirection === "extend" ? "Extend Internship" : "Reduce Internship"}
      >
        <div className="space-y-3">
          <div className="flex gap-1 rounded-lg bg-[#141414] p-1">
            {(["extend", "reduce"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setExtendDirection(dir)}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                  extendDirection === dir
                    ? dir === "extend"
                      ? "bg-[#7C3AED] text-white"
                      : "bg-red-600 text-white"
                    : "text-[#8A8A8A] hover:text-white"
                }`}
              >
                {dir}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-lg bg-[#141414] p-1">
            {(["months", "days"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setExtendMode(mode)}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-medium capitalize transition-colors ${
                  extendMode === mode ? "bg-[#2A2A2A] text-white" : "text-[#8A8A8A] hover:text-white"
                }`}
              >
                By {mode}
              </button>
            ))}
          </div>
          {extendMode === "months" ? (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">
                Months to {extendDirection}
              </span>
              <AdminSelect value={extendMonths} onChange={(e) => setExtendMonths(e.target.value)} className="w-full">
                {DURATION_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m} month{m === 1 ? "" : "s"}
                  </option>
                ))}
              </AdminSelect>
            </label>
          ) : (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-[#8A8A8A]">
                Days to {extendDirection}
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                placeholder="e.g. 5"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-2.5 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
              />
            </label>
          )}
          <textarea
            value={extendReason}
            onChange={(e) => setExtendReason(e.target.value)}
            rows={3}
            placeholder="Reason (optional)"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setExtendOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton
              variant={extendDirection === "reduce" ? "danger" : "primary"}
              loading={extendBusy}
              onClick={submitExtend}
            >
              {extendDirection === "extend" ? "Extend" : "Reduce"}
            </AdminButton>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={submitComplete}
        loading={completeBusy}
        title="Mark internship as completed?"
        body={`${intern.name}'s status will change to "completed" and they'll lose access to applying for new leave. Their portal and history stay viewable.`}
        confirmLabel="Mark Completed"
      />

      {/* Terminate modal (needs a reason, so it's a full Modal not ConfirmModal) */}
      <Modal open={terminateOpen} onClose={() => setTerminateOpen(false)} title="Terminate internship">
        <div className="space-y-3">
          <p className="text-[13px] leading-relaxed text-[#B0B0B0]">
            {intern.name}&apos;s status will change to &ldquo;terminated&rdquo; and they&apos;ll lose access to
            applying for new leave. A reason is required.
          </p>
          <textarea
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            rows={3}
            placeholder="Reason for termination (required)"
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 text-[13px] text-white placeholder:text-[#5A5A5A] outline-none focus:border-[#7C3AED]"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setTerminateOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton variant="danger" loading={terminateBusy} onClick={submitTerminate}>
              Terminate
            </AdminButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
