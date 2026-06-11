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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#14141F] border border-[rgba(255,255,255,0.12)] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <AlertCircle size={15} className="text-[#A78BFA] flex-shrink-0" strokeWidth={2} />
        <span className="text-[13px] font-medium text-[rgba(255,255,255,0.9)] whitespace-nowrap">
          {message}
        </span>
      </div>
    </div>
  )
}
