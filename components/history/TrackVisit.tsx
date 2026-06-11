// components/history/TrackVisit.tsx
"use client"

import { useEffect } from "react"
import { trackHistory, type HistoryStatus } from "@/lib/hooks/useHistory"

// Invisible client component — records a history visit on mount. Lets server
// components (e.g. the idea page) "call trackHistory on load" without becoming
// client components themselves.
export function TrackVisit({
  ideaId,
  status,
}: {
  ideaId: string
  status: HistoryStatus
}) {
  useEffect(() => {
    trackHistory(ideaId, status)
  }, [ideaId, status])

  return null
}
