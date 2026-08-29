"use client"

// /admin/scheduled-emails — every queued/sent/failed ScheduledEmail across
// both broadcast features (intern_broadcast + user_broadcast). Queued rows
// can be canceled or rescheduled; anything else is history-only.
import { useEffect, useState } from "react"
import { CalendarClock } from "lucide-react"
import { AdminButton, AdminCard, AdminInput, ConfirmModal, Modal, Spinner, fmtDateTime, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type ScheduledEmailRow = {
  id: string
  type: "intern_broadcast" | "user_broadcast"
  subject: string
  recipientType: string
  recipientIds: string[]
  scheduledFor: string
  status: "queued" | "sending" | "sent" | "failed"
  sentCount: number | null
  failedCount: number | null
  createdBy: string
  createdAt: string
}

const TYPE_LABEL: Record<ScheduledEmailRow["type"], string> = {
  intern_broadcast: "Intern Broadcast",
  user_broadcast: "User Broadcast",
}

const STATUS_STYLES: Record<ScheduledEmailRow["status"], string> = {
  queued: "bg-blue-500/15 text-blue-400",
  sending: "bg-amber-500/15 text-amber-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
}

function recipientSummary(row: ScheduledEmailRow): string {
  if (row.type === "intern_broadcast") {
    return row.recipientType === "all"
      ? "All Active Interns"
      : `${row.recipientIds.length} selected intern${row.recipientIds.length === 1 ? "" : "s"}`
  }
  switch (row.recipientType) {
    case "all":
      return "All Users"
    case "pro":
      return "Pro Users"
    case "growth":
      return "Growth Users"
    case "free":
      return "Free Users"
    case "custom":
      return `${row.recipientIds.length} custom email${row.recipientIds.length === 1 ? "" : "s"}`
    default:
      return row.recipientType
  }
}

// datetime-local's `min` for the reschedule modal.
function minScheduleValue(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ScheduledEmailsList() {
  const { toast } = useToast()
  const [rows, setRows] = useState<ScheduledEmailRow[] | null>(null)
  const [canceling, setCanceling] = useState<ScheduledEmailRow | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [rescheduling, setRescheduling] = useState<ScheduledEmailRow | null>(null)
  const [rescheduleValue, setRescheduleValue] = useState("")
  const [rescheduleBusy, setRescheduleBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/admin/scheduled-emails")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.scheduledEmails)
    } catch {
      setRows([])
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [])

  const openReschedule = (row: ScheduledEmailRow) => {
    setRescheduling(row)
    setRescheduleValue(toDateTimeLocalValue(row.scheduledFor))
  }

  const confirmReschedule = async () => {
    if (!rescheduling) return
    setRescheduleBusy(true)
    try {
      const res = await fetch(`/api/admin/scheduled-emails/${rescheduling.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: new Date(rescheduleValue).toISOString() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Rescheduled", "success")
      setRescheduling(null)
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to reschedule", "error")
    } finally {
      setRescheduleBusy(false)
    }
  }

  const confirmCancel = async () => {
    if (!canceling) return
    setCancelBusy(true)
    try {
      const res = await fetch(`/api/admin/scheduled-emails/${canceling.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Canceled", "success")
      setCanceling(null)
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to cancel", "error")
    } finally {
      setCancelBusy(false)
    }
  }

  if (rows === null) return <Spinner label="Loading scheduled emails…" />

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Scheduled For</th>
                <th className={tableCls.th}>Type</th>
                <th className={tableCls.th}>Subject</th>
                <th className={tableCls.th}>Recipients</th>
                <th className={tableCls.th}>Status</th>
                <th className={tableCls.th}>Created By</th>
                <th className={tableCls.th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className={tableCls.td} colSpan={7}>
                    No scheduled emails yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className={tableCls.row}>
                  <td className={tableCls.td}>{fmtDateTime(r.scheduledFor)}</td>
                  <td className={tableCls.td}>{TYPE_LABEL[r.type]}</td>
                  <td className={`${tableCls.td} max-w-[260px] truncate`} title={r.subject}>
                    {r.subject}
                  </td>
                  <td className={tableCls.td}>{recipientSummary(r)}</td>
                  <td className={tableCls.td}>
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_STYLES[r.status]}`}
                    >
                      {r.status}
                    </span>
                    {r.status === "sent" && (
                      <span className="ml-2 text-[11px] text-[#6A6A6A]">
                        {r.sentCount ?? 0} sent{r.failedCount ? `, ${r.failedCount} failed` : ""}
                      </span>
                    )}
                  </td>
                  <td className={tableCls.td}>{r.createdBy}</td>
                  <td className={tableCls.td}>
                    {r.status === "queued" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openReschedule(r)}
                          className="text-[12px] font-medium text-[#8A8A8A] hover:text-white transition-colors"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => setCanceling(r)}
                          className="text-[12px] font-medium text-red-400 hover:text-red-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <Modal open={!!rescheduling} onClose={() => setRescheduling(null)} title="Reschedule">
        <div className="space-y-4">
          <p className="text-[13px] text-[#B0B0B0]">
            Pick a new send time for &ldquo;{rescheduling?.subject}&rdquo;.
          </p>
          <AdminInput
            type="datetime-local"
            value={rescheduleValue}
            min={minScheduleValue()}
            onChange={(e) => setRescheduleValue(e.target.value)}
            className="w-full"
          />
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setRescheduling(null)}>
              Cancel
            </AdminButton>
            <AdminButton loading={rescheduleBusy} disabled={!rescheduleValue} onClick={confirmReschedule}>
              <CalendarClock className="h-3.5 w-3.5" />
              Save
            </AdminButton>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!canceling}
        onClose={() => setCanceling(null)}
        loading={cancelBusy}
        title="Cancel this scheduled email?"
        body={`"${canceling?.subject}" won't be sent. This can't be undone.`}
        confirmLabel="Cancel Send"
        onConfirm={confirmCancel}
      />
    </div>
  )
}
