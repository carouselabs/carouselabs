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
    <div role="status" className="flex shrink-0 items-center gap-3 border-b border-warning/25 bg-warning-soft px-4 py-2.5 text-label text-foreground">
      <AlertTriangle size={16} className="shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1 font-medium">
        You&apos;ve used all your free credits! Upgrade to Pro or Growth to keep creating.
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control-sm bg-warning px-3 text-caption font-semibold text-warning-soft transition-colors duration-(--motion-fast) hover:bg-[color-mix(in_oklab,var(--warning),var(--foreground)_18%)]"
      >
        Upgrade Now
        <NavigatingIndicator />
      </Link>
    </div>
  )
}
