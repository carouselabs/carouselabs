"use client"

// /intern — self-service "Apply for Leave" card. Auto-approved on submit
// (POST /api/intern/leave); refreshes the whole portal page afterward so the
// balance, calendar, and taken-dates list all pick up the new leave day.
import { useState } from "react"
import { useRouter } from "next/navigation"

// text-[16px] on mobile — anything smaller makes iOS Safari auto-zoom the
// page on focus; sm:text-[13px] restores the compact desktop size once
// zoom-on-focus isn't a concern. py-3 (not py-2.5) keeps the ~44px min tap
// target with the larger mobile font.
const inputCls =
  "w-full px-3.5 py-3 rounded-lg bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-[16px] sm:text-[13px] focus:outline-none focus:border-[#7C3AED]/50 transition-colors"

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function LeaveApplication({
  remaining,
  total,
  takenDates,
}: {
  remaining: number
  total: number
  takenDates: string[]
}) {
  const router = useRouter()

  const [date, setDate] = useState(todayStr())
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const takenSet = new Set(takenDates)
  const dateTaken = takenSet.has(date)
  const noBalance = remaining <= 0

  const submit = async () => {
    setSuccess(null)
    if (dateTaken) {
      setError("You already have a record for this date")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/intern/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason: reason.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      setReason("")
      setSuccess(`Leave applied for ${date}.`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Failed to apply for leave")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#E5E3DE] bg-white p-4 sm:p-5">
      <h2 className="mb-1 text-[13px] font-semibold text-[#0A0A0A]">Apply for Leave</h2>
      <p className="mb-4 text-[13px] text-[#6B7280]">
        You have <span className="font-semibold text-[#0A0A0A]">{remaining} of {total}</span> leave days
        remaining.
      </p>

      {success && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-[13px] text-emerald-700">{success}</p>
      )}
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>}

      {noBalance ? (
        <p className="rounded-lg bg-[#F1EFE9] px-3.5 py-2.5 text-[13px] font-medium text-[#6B7280]">
          No leave days remaining
        </p>
      ) : (
        <div className="space-y-3">
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => {
              setDate(e.target.value)
              setError(null)
            }}
            className={inputCls}
          />
          {dateTaken && (
            <p className="text-[12px] text-red-600">
              You already have an attendance or leave record for this date.
            </p>
          )}
          <input
            type="text"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
          />
          <button
            onClick={submit}
            disabled={submitting || dateTaken}
            className="min-h-11 w-full touch-manipulation rounded-lg bg-[#7C3AED] px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#6D28D9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Leave Request"}
          </button>
        </div>
      )}
    </div>
  )
}
