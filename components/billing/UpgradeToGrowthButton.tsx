"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// Pro → Growth upgrade CTA. Schedules the upgrade for the next renewal via
// POST /api/billing/upgrade — the user is not charged today; Growth pricing
// and the 2,000-credit allowance kick in at renewal.
export function UpgradeToGrowthButton({
  renewalDate,
  upgradeScheduled,
}: {
  renewalDate: string | null
  upgradeScheduled: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scheduled, setScheduled] = useState(upgradeScheduled)

  const dateLabel = renewalDate ?? "your next renewal"

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/upgrade", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Failed to schedule upgrade")
      }
      setScheduled(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (scheduled) {
    return (
      <div className="w-full inline-flex items-center justify-center px-5 py-3 rounded-control border border-[#F59E0B]/30 bg-warning/10 text-label font-semibold text-warning text-center">
        Growth upgrade scheduled for {dateLabel}! No charge today.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-control text-label font-semibold text-white bg-warning hover:bg-warning/90 shadow-card transition-all disabled:opacity-60"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? "Scheduling…" : `Upgrade to Growth — Starting ${dateLabel}`}
      </button>
      {error ? (
        <p className="text-caption text-danger text-center leading-snug">{error}</p>
      ) : (
        <p className="text-caption text-muted-foreground text-center leading-snug">
          Your Growth plan will activate on your next renewal date. You&apos;ll be charged $45.99
          then and get 2,000 credits. No charge today.
        </p>
      )}
    </div>
  )
}
