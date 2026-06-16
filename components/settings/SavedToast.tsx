// components/settings/SavedToast.tsx
"use client"

import { useEffect } from "react"
import { Check } from "lucide-react"

interface SavedToastProps {
  open: boolean
  onClose: () => void
  message?: string
}

// Small floating confirmation, auto-dismisses after 2.5s.
export function SavedToast({ open, onClose, message = "Saved" }: SavedToastProps) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14141F] border border-[rgba(110,231,183,0.3)] shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <Check size={14} className="text-[#059669]" strokeWidth={2.5} />
        <span className="text-[13px] font-medium text-[#0A0A0A]">{message}</span>
      </div>
    </div>
  )
}
