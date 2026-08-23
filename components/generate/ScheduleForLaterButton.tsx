"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Loader2 } from "lucide-react"

interface ScheduleForLaterButtonProps {
  /**
   * Resolves the Post to schedule right before navigating — every caller
   * implements whatever it needs (a plain id lookup, or save-then-return-id
   * for a flow where the Post might not exist/be up to date yet). Return
   * null to signal "nothing to schedule" (shows a small inline error
   * instead of navigating).
   */
  getPostId: () => Promise<string | null>
  disabled?: boolean
}

// Deep-links into Content Hub's Add panel with this post pre-selected —
// the "Schedule for Later" counterpart to PostToLinkedInButton's "Post Now",
// shown alongside it on every generation result screen.
export function ScheduleForLaterButton({ getPostId, disabled }: ScheduleForLaterButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const id = await getPostId()
      if (!id) {
        setError("Nothing to schedule yet")
        return
      }
      router.push(`/content-hub?postId=${id}`)
    } catch {
      setError("Failed to save — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-[#7C3AED] bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.14)] border border-[rgba(124,58,237,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
        ) : (
          <CalendarClock size={13} strokeWidth={2.2} />
        )}
        {loading ? "Saving…" : "Schedule for Later"}
      </button>
      {error && <p className="text-[11px] text-[rgba(239,68,68,0.9)]">{error}</p>}
    </div>
  )
}
