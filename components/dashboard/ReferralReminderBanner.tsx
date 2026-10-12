"use client"

// Once-per-calendar-week nudge about the referral program (see
// app/api/referrals/reminder). Styled to match the dashboard's own
// "Work on Own Idea" card (app/(app)/dashboard/page.tsx) rather than the
// global ProfileReviewBanner — this one lives inside the dashboard's own
// content area, not the app-wide layout header.
import { useEffect, useState } from "react"
import Link from "next/link"
import { Gift, X } from "lucide-react"

interface ReminderData {
  show: boolean
  referralLink?: string
  hasReferrals?: boolean
  earnedThisMonth?: number
}

export function ReferralReminderBanner() {
  const [data, setData] = useState<ReminderData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/referrals/reminder")
      .then((res) => (res.ok ? res.json() : { show: false }))
      .then((d: ReminderData) => {
        if (active) setData(d)
      })
      .catch(() => {
        if (active) setData({ show: false })
      })
    return () => {
      active = false
    }
  }, [])

  if (!data?.show || dismissed) return null

  const message =
    data.hasReferrals && (data.earnedThisMonth ?? 0) > 0
      ? `You've earned $${data.earnedThisMonth!.toFixed(2)} this month from referrals!`
      : "Know someone who'd love CarouseLabs? Share your referral link and earn 8% commission."

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-control border border-brand/25 bg-brand-soft/50 px-4 py-3 sm:flex-nowrap">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control-sm bg-brand-soft text-brand">
        <Gift className="size-4" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-label text-foreground">{message}</p>
      <Link
        href="/settings/referrals"
        className="inline-flex h-8 shrink-0 items-center rounded-control-sm bg-brand px-3 text-caption font-semibold text-brand-foreground transition-colors duration-(--motion-fast) hover:bg-brand-hover"
      >
        {data.hasReferrals && (data.earnedThisMonth ?? 0) > 0 ? "View Referrals" : "Get Your Link"}
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="relative shrink-0 rounded-detail text-muted-foreground transition-colors duration-(--motion-fast) after:absolute after:-inset-3 after:content-[''] hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
