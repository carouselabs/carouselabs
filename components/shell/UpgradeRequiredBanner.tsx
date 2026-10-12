"use client"

// Persistent nudge for a FREE-plan user who has used up their 25-credit
// lifetime pool — shown on every page until they upgrade (see
// app/(app)/layout.tsx, which computes `show` server-side from the same
// Subscription fields lib/credits.ts's availableCredits() uses to gate
// generation itself).
//
// Deliberately has NO dismiss button, unlike components/shell/ProfileReviewBanner.tsx
// — this isn't an informational aside, it's a standing reminder that should
// only ever go away because the underlying condition (plan === "FREE" &&
// creditsUsed >= FREE_LIFETIME_CREDITS) actually changed, i.e. they upgraded.
import Link, { useLinkStatus } from "next/link"
import { AlertTriangle, Loader2 } from "lucide-react"

// Renders inside the <Link> below (useLinkStatus requires a descendant of
// Link) — shows a spinner the instant the button is clicked and stays
// visible until the navigation actually lands.
function NavigatingIndicator() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Loader2 size={13} className="animate-spin" aria-hidden />
}

export function UpgradeRequiredBanner({ show }: { show: boolean }) {
  if (!show) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(217,119,6,0.1)] border-b border-[rgba(217,119,6,0.3)] text-[13px] text-[#0A0A0A]">
      <AlertTriangle size={15} className="text-[#D97706] flex-shrink-0" />
      <p className="flex-1 min-w-0 font-medium">
        You&apos;ve used all your free credits! Upgrade to Pro or Growth to keep creating.
      </p>
      <Link
        href="/settings/billing"
        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-[12.5px] font-semibold text-white transition-colors"
      >
        Upgrade Now
        <NavigatingIndicator />
      </Link>
    </div>
  )
}
