"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

interface RegenerationLimitProps {
  open: boolean
  onClose: () => void
  message?: string
}

// Floating bottom toast that auto-dismisses after 5 seconds. Used to quietly
// tell the user they've hit the regeneration limit — there's no counter
// anywhere else, so this is the only signal they get.
export function RegenerationLimit({
  open,
  onClose,
  message = "You've used both regenerations for this session",
}: RegenerationLimitProps) {
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-(--z-toast) flex justify-center md:bottom-6">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-2.5 rounded-control bg-foreground px-4 py-3 text-background shadow-dialog"
      >
        <AlertCircle className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className="text-label font-medium">{message}</span>
      </div>
    </div>
  )
}
