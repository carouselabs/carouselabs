"use client"

import { useRef, useState } from "react"
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
  const inFlight = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    setLoading(true)
    try {
      const id = await getPostId()
      if (!id) {
        setError("Nothing to schedule yet")
        return
      }
      router.push(`/content-hub?postId=${encodeURIComponent(id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed. Please try again.")
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className="inline-flex h-9 items-center gap-1.5 rounded-control-sm border border-brand/30 bg-brand-soft px-3 text-label font-semibold whitespace-nowrap text-brand transition-colors duration-(--motion-fast) hover:border-brand/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <CalendarClock className="size-4" aria-hidden />
        )}
        {loading ? "Saving…" : "Schedule for Later"}
      </button>
      {error && <p role="alert" className="max-w-56 text-caption text-danger">{error}</p>}
    </div>
  )
}
