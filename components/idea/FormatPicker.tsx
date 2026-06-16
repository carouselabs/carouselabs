"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Image, LayoutTemplate, Check, Lock } from "lucide-react"
import { trackHistory, type HistoryStatus } from "@/lib/hooks/useHistory"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Format {
  id: string
  label: string
  description: string
  icon: React.ElementType
  status: HistoryStatus
  href: (ideaId: string) => string
}

const FORMATS: Format[] = [
  {
    id: "caption",
    label: "Caption Only",
    description: "A scroll-stopping LinkedIn caption, ready to post",
    icon: FileText,
    status: "CAPTION",
    href: (id) => `/generate/caption?ideaId=${id}`,
  },
  {
    id: "image_caption",
    label: "Image + Caption",
    description: "Caption and a single AI-generated visual",
    icon: Image,
    status: "IMAGE",
    href: (id) => `/generate/image?ideaId=${id}`,
  },
  {
    id: "slides",
    label: "Caption + Slides",
    description: "Caption and a full 7–8 slide LinkedIn carousel",
    icon: LayoutTemplate,
    status: "CAROUSEL",
    href: (id) => `/generate/carousel?ideaId=${id}`,
  },
]

interface FormatPickerProps {
  ideaId: string
  plan: "FREE" | "PRO"
}

export function FormatPicker({ ideaId }: FormatPickerProps) {
  const router = useRouter()
  const storageKey = `selectedFormat_${ideaId}`

  // The format locked in for this session (null = nothing chosen yet).
  const [lockedId, setLockedId] = useState<string | null>(null)
  // The format awaiting first-time confirmation in the dialog.
  const [pending, setPending] = useState<Format | null>(null)

  // Read the locked format from localStorage on mount (client-only). Setting
  // state here is the SSR-safe way to hydrate from localStorage without a
  // hydration mismatch; a lazy initializer would diverge from the server render.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLockedId(localStorage.getItem(storageKey))
    } catch {
      // localStorage unavailable — treat as unlocked
    }
  }, [storageKey])

  function goToFormat(format: Format) {
    trackHistory(ideaId, format.status)
    router.push(format.href(ideaId))
  }

  function handleClick(format: Format) {
    if (lockedId === null) {
      // First choice — confirm before locking.
      setPending(format)
    } else if (lockedId === format.id) {
      // Already locked into this one — go straight through.
      goToFormat(format)
    }
    // Locked into a different format → button is disabled, nothing to do.
  }

  function handleConfirm() {
    if (!pending) return
    try {
      localStorage.setItem(storageKey, pending.id)
    } catch {
      // persistence is best-effort
    }
    setLockedId(pending.id)
    const chosen = pending
    setPending(null)
    goToFormat(chosen)
  }

  const activeFormat = FORMATS.find((f) => f.id === lockedId) ?? null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] font-medium text-[#ADA99F] uppercase tracking-widest">
        Choose Output Type
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FORMATS.map((format) => {
          const Icon = format.icon
          const isActive = lockedId === format.id
          const isLocked = lockedId !== null && lockedId !== format.id

          return (
            <button
              key={format.id}
              onClick={() => handleClick(format)}
              disabled={isLocked}
              className={[
                "group relative flex flex-col gap-2.5 p-4 rounded-xl border text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]/50",
                isActive
                  ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.1)] shadow-[0_0_24px_rgba(26,26,26,0.18)] cursor-pointer"
                  : isLocked
                    ? "border-[#E9E7E1] bg-[#F6F4EE] opacity-50 cursor-not-allowed"
                    : "border-[#E5E3DE] bg-[#F4F2EC] hover:border-[rgba(26,26,26,0.4)] hover:bg-[rgba(26,26,26,0.06)] cursor-pointer",
              ].join(" ")}
            >
              {/* Status marker — checkmark when active, lock when locked */}
              {isActive && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </span>
              )}
              {isLocked && (
                <span className="absolute top-3 right-3 text-[#9CA3AF]">
                  <Lock size={13} strokeWidth={2} />
                </span>
              )}

              <div
                className={[
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  isActive
                    ? "bg-[rgba(26,26,26,0.2)] border border-[rgba(26,26,26,0.4)]"
                    : "bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.2)]",
                ].join(" ")}
              >
                <Icon size={15} className="text-[#1A1A1A]" strokeWidth={1.8} />
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[#1A1A1A]">
                  {format.label}
                </span>
                <span className="text-[12px] text-[#9CA3AF] leading-[1.4]">
                  {format.description}
                </span>
                {isLocked && (
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#9CA3AF]">
                    <Lock size={10} strokeWidth={2} />
                    Locked for this session
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Continue — jumps straight to the locked format's page */}
      {activeFormat && (
        <button
          onClick={() => goToFormat(activeFormat)}
          className="self-start mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
        >
          Continue to {activeFormat.label} →
        </button>
      )}

      {/* First-time lock-in confirmation */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="bg-[#FFFFFF] border-[#E5E3DE] text-[#0A0A0A]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[#0A0A0A]">
              Lock in this format?
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#6B7280] leading-[1.55]">
              Once you choose Caption Only / Image + Caption / Caption + Slides,
              the other formats will be locked for this session. You can start a
              new session to try a different format.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setPending(null)}
              className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
            >
              Yes, lock it in →
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
