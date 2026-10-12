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
    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[rgba(124,58,237,0.04)] border border-[rgba(124,58,237,0.25)]">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[rgba(124,58,237,0.10)] flex items-center justify-center">
        <Gift size={15} className="text-[#7C3AED]" strokeWidth={2} />
      </div>
      <p className="flex-1 min-w-0 text-[13px] text-[#374151] leading-[1.4]">{message}</p>
      <Link
        href="/settings/referrals"
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-[12.5px] font-semibold text-white transition-colors"
      >
        {data.hasReferrals && (data.earnedThisMonth ?? 0) > 0 ? "View Referrals" : "Get Your Link"}
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  )
}
