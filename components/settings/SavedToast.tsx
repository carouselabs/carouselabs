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
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-(--z-toast) flex justify-center md:bottom-6">
      <div role="status" className="flex items-center gap-2 rounded-control bg-foreground px-4 py-2.5 text-background shadow-dialog">
        <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
        <span className="text-label font-medium">{message}</span>
      </div>
    </div>
  )
}
