"use client"

// Shown across the app when an admin pre-filled this user's profile (see
// app/api/admin/prefill-user) and they haven't reviewed/dismissed it yet.
// Visiting Settings > Profile and saving any change also clears the flag
// server-side (see the PATCH handler in app/api/profile/route.ts) — this
// button covers "I looked, it's fine, leave me alone."
import { useState } from "react"
import Link, { useLinkStatus } from "next/link"
import { Info, X, Loader2 } from "lucide-react"

// Renders inside the <Link> below (useLinkStatus requires a descendant of
// Link) — shows a spinner the instant the link is clicked and stays visible
// until the navigation actually lands, so a slow/cold-prefetch transition to
// /settings/profile doesn't read as the click having done nothing.
function NavigatingIndicator() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <Loader2 size={12} className="inline-block animate-spin" aria-hidden />
}

export function ProfileReviewBanner({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(false)

  if (!show || dismissed) return null

  async function handleDismiss() {
    setDismissed(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissProfileReview: true }),
      })
    } catch {
      // best-effort — worst case the banner reappears on next load
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(124,58,237,0.08)] border-b border-[rgba(124,58,237,0.2)] text-[13px] text-[#0A0A0A]">
      <Info size={15} className="text-[#7C3AED] flex-shrink-0" />
      <p className="flex-1 min-w-0">
        We&apos;ve set up your profile based on our conversation — please{" "}
        <Link
          href="/settings/profile"
          className="font-medium text-[#7C3AED] hover:underline inline-flex items-center gap-1.5"
        >
          review and update it
          <NavigatingIndicator />
        </Link>{" "}
        to make sure it matches your business!
      </p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-[#9CA3AF] hover:text-[#0A0A0A] transition-colors"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  )
}
