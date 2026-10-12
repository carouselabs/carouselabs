"use client"

// /intern — self-service "Apply for Leave" card. Auto-approved on submit
// (POST /api/intern/leave); refreshes the whole portal page afterward so the
// balance, calendar, and taken-dates list all pick up the new leave day.
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"

// The kit's control (16px text on phones, so iOS Safari doesn't zoom on
// focus) at the 44px tap height.
const inputCls = cn(controlClasses, "h-11 px-3.5")

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
      setSuccess(data.status === "absent" ? "Marked as Absent — no leave days remaining" : "Leave approved")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Failed to apply for leave")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-1 text-body font-semibold text-foreground">Apply for Leave</h2>
      <p className="mb-4 text-label text-muted-foreground">
        You have <span className="font-semibold text-foreground">{remaining} of {total}</span> leave days
        remaining.
      </p>

      {success && (
        <p role="status" className="mb-3 rounded-control-sm bg-success-soft px-3.5 py-2.5 text-label text-success">{success}</p>
      )}
      {error && <p role="alert" className="mb-3 rounded-control-sm bg-danger-soft px-3.5 py-2.5 text-label text-danger">{error}</p>}

      <div className="space-y-3">
        {noBalance && (
          <p className="rounded-control-sm bg-warning-soft px-3.5 py-2.5 text-caption font-medium text-warning">
            You&apos;re out of leave days. Applying now will mark you Absent instead of Leave.
          </p>
        )}
        <input
          type="date"
          value={date}
          min={todayStr()}
          onChange={(e) => {
            setDate(e.target.value)
            setError(null)
          }}
          aria-label="Date"
          className={inputCls}
        />
        {dateTaken && (
          <p className="text-caption text-danger">
            You already have an attendance or leave record for this date.
          </p>
        )}
        <input
          type="text"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Reason (optional)"
          className={inputCls}
        />
        <Button
          variant={noBalance ? "destructive" : "brand"}
          onClick={submit}
          disabled={submitting || dateTaken}
          className="h-auto min-h-11 w-full touch-manipulation py-2.5 whitespace-normal"
        >
          {submitting
            ? "Submitting…"
            : noBalance
              ? "Apply (will be marked Absent — no leave days left)"
              : "Submit Leave Request"}
        </Button>
      </div>
    </section>
  )
}
