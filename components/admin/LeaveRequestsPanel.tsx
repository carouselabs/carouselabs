"use client"

// Admin-visible list of an intern's self-service leave requests. Not
// approval-gated (requests are auto-approved on creation) — admins can only
// Revoke a mistaken one, which deletes the InternLeaveRequest and its
// matching "self"-marked InternAttendance row together, restoring balance.
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { AdminCard, ConfirmModal, fmtDate, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

export type LeaveRequest = {
  id: string
  date: string
  reason: string | null
  status: string
  requestedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
}

export type LeaveBalance = { total: number; used: number; remaining: number }

export function LeaveRequestsPanel({
  internId,
  leaveRequests,
  leaveBalance,
  onRevoked,
}: {
  internId: string
  leaveRequests: LeaveRequest[]
  leaveBalance: LeaveBalance
  onRevoked: () => void
}) {
  const { toast } = useToast()
  const [revoking, setRevoking] = useState<LeaveRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const confirmRevoke = async () => {
    if (!revoking) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/interns/${internId}/leave/${revoking.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast("Leave request revoked", "success")
      setRevoking(null)
      onRevoked()
    } catch {
      toast("Failed to revoke leave request", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminCard
      title={`Leave Requests (${leaveRequests.length})`}
      actions={
        <span className="text-[12px] text-[#8A8A8A]">
          {leaveBalance.used}/{leaveBalance.total} used ·{" "}
          <span className="text-white font-semibold">{leaveBalance.remaining} remaining</span>
        </span>
      }
    >
      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Date</th>
              <th className={tableCls.th}>Reason</th>
              <th className={tableCls.th}>Status</th>
              <th className={tableCls.th}>Applied</th>
              <th className={tableCls.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.length === 0 && (
              <tr>
                <td className={tableCls.td} colSpan={5}>
                  No leave requests
                </td>
              </tr>
            )}
            {leaveRequests.map((r) => (
              <tr key={r.id} className={tableCls.row}>
                <td className={tableCls.td}>{fmtDate(r.date)}</td>
                <td className={`${tableCls.td} max-w-[280px] truncate text-[#8A8A8A]`}>{r.reason ?? "—"}</td>
                <td className={tableCls.td}>
                  <span className="inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className={tableCls.td}>{fmtDate(r.requestedAt)}</td>
                <td className={tableCls.td}>
                  <button
                    onClick={() => setRevoking(r)}
                    className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-red-500/15 hover:text-red-400 transition-colors"
                    aria-label="Revoke leave request"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={confirmRevoke}
        loading={busy}
        title="Revoke leave request?"
        body={
          revoking
            ? `This removes the leave request for ${fmtDate(revoking.date)} and restores 1 day to their balance.`
            : ""
        }
        confirmLabel="Revoke"
      />
    </AdminCard>
  )
}
