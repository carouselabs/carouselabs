"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Image, LayoutTemplate, Check, Lock } from "lucide-react"
import { trackHistory, type HistoryStatus } from "@/lib/hooks/useHistory"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  credits: number
  icon: React.ElementType
  status: HistoryStatus
  href: (ideaId: string) => string
}

const FORMATS: Format[] = [
  {
    id: "caption",
    label: "Caption Only",
    description: "A scroll-stopping LinkedIn caption, ready to post",
    credits: CREDIT_COSTS.caption_only,
    icon: FileText,
    status: "CAPTION",
    href: (id) => `/generate/caption?ideaId=${id}`,
  },
  {
    id: "image_caption",
    label: "Image + Caption",
    description: "Caption and a single AI-generated visual",
    credits: CREDIT_COSTS.image_caption,
    icon: Image,
    status: "IMAGE",
    href: (id) => `/generate/image?ideaId=${id}`,
  },
  {
    id: "slides",
    label: "Caption + Slides",
    description: "Caption and a full 7–8 slide LinkedIn carousel",
    credits: CREDIT_COSTS.carousel,
    icon: LayoutTemplate,
    status: "CAROUSEL",
    href: (id) => `/generate/carousel?ideaId=${id}`,
  },
]

interface FormatPickerProps {
  ideaId: string
  plan: "FREE" | "PRO" | "GROWTH"
  // While true (breakdown still generating), all options are visible but
  // disabled so the user can't pick a format before the breakdown is ready.
  disabled?: boolean
}

export function FormatPicker({ ideaId, plan, disabled = false }: FormatPickerProps) {
  const router = useRouter()
  const storageKey = `selectedFormat_${ideaId}`

  // Carousels are a Pro-only feature. Free users (even with their 1 lifetime
  // credit) can only use Caption Only and Image + Caption.
  const isProLocked = (format: Format) => format.id === "slides" && plan === "FREE"

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
    if (disabled) return // breakdown still generating
    if (isProLocked(format)) {
      // Carousels need Pro — send Free users to upgrade instead of selecting.
      router.push("/settings/billing")
      return
    }
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
    <div className="flex flex-col gap-4">
      <h2 className="text-label font-semibold text-foreground">Choose Output Type</h2>

      <div className="flex flex-col gap-2.5">
        {FORMATS.map((format) => {
          const Icon = format.icon
          const isActive = lockedId === format.id
          const isLocked = lockedId !== null && lockedId !== format.id
          const proLocked = isProLocked(format)

          return (
            <button
              key={format.id}
              type="button"
              onClick={() => handleClick(format)}
              disabled={isLocked || disabled}
              aria-pressed={isActive}
              className={cn(
                "group relative flex items-start gap-3.5 rounded-card border p-4 text-left transition-[border-color,background-color,box-shadow,opacity] duration-(--motion-fast)",
                disabled
                  ? "cursor-not-allowed border-border bg-surface opacity-50"
                  : isActive
                    ? "border-foreground bg-surface-raised shadow-card"
                    : isLocked
                      ? "cursor-not-allowed border-border bg-surface opacity-50"
                      : proLocked
                        ? "border-border bg-surface opacity-80 hover:border-brand/50 hover:opacity-100"
                        : "border-border bg-surface hover:border-control-border hover:bg-surface-raised hover:shadow-card"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-control-sm",
                  isActive ? "bg-foreground text-background" : "bg-surface-muted text-foreground"
                )}
              >
                <Icon className="size-4" strokeWidth={1.8} aria-hidden />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1 pr-6">
                <span className="text-label font-semibold text-foreground">{format.label}</span>
                <span className="text-caption text-muted-foreground">{format.description}</span>
                <span className="mt-1 self-start rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[11px] leading-4 font-semibold text-foreground tabular-nums">
                  {format.credits} credits
                </span>
                {isLocked && (
                  <span className="mt-1 inline-flex items-center gap-1 text-caption font-medium text-muted-foreground">
                    <Lock className="size-3" strokeWidth={2} aria-hidden />
                    Locked for this session
                  </span>
                )}
                {proLocked && !isActive && (
                  <span className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-brand">
                    <Lock className="size-3" strokeWidth={2.4} aria-hidden />
                    Upgrade to Pro to unlock carousels
                  </span>
                )}
              </span>

              {/* Status marker — checkmark when active, lock when locked / Pro-gated */}
              {isActive && (
                <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              )}
              {(isLocked || (proLocked && !isActive)) && (
                <span className="absolute top-4 right-4 text-muted-foreground">
                  <Lock className="size-3.5" strokeWidth={2} aria-hidden />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Continue — jumps straight to the locked format's page */}
      {activeFormat && (
        <Button size="lg" onClick={() => goToFormat(activeFormat)} disabled={disabled} className="w-full">
          Continue to {activeFormat.label} →
        </Button>
      )}

      {/* First-time lock-in confirmation */}
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock in this format?</DialogTitle>
            <DialogDescription>
              Once you choose Caption Only / Image + Caption / Caption + Slides,
              the other formats will be locked for this session. You can start a
              new session to try a different format.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Yes, lock it in →</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
