"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface StepNavProps {
  backHref?: string
  onContinue: () => void | Promise<void>
  canContinue: boolean
  continueLabel?: string
  showSkip?: boolean
  onSkip?: () => void
  // Only needed by steps with a real async save (e.g. voice's /api/profile
  // call) — steps that just write to the local store manage their own
  // (synchronous) loading flash internally instead.
  loading?: boolean
  // Exact copy for what's missing, e.g. "Please add at least 3 topics to
  // continue." Shown above the button — and the button shakes — when the
  // user clicks Continue while canContinue is false. Omit on steps with no
  // required fields (e.g. goals/voice, which are skippable).
  validationMessage?: string
  // Fired alongside the warning/shake so the page can highlight its own
  // empty field(s) in red.
  onInvalid?: () => void
}

export function StepNav({
  backHref,
  onContinue,
  canContinue,
  continueLabel = "Continue",
  showSkip = false,
  onSkip,
  loading: loadingProp,
  validationMessage,
  onInvalid,
}: StepNavProps) {
  const router = useRouter()
  const [internalLoading, setInternalLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [shake, setShake] = useState(false)

  // Loading is either driven by the caller (a real async save) or managed
  // here (a step that just writes to the store and navigates) — never both.
  const isControlled = loadingProp !== undefined
  const loading = isControlled ? loadingProp : internalLoading

  const handleContinue = async () => {
    if (loading) return

    if (!canContinue) {
      setShowWarning(true)
      setShake(true)
      onInvalid?.()
      setTimeout(() => setShake(false), 400)
      return
    }

    setShowWarning(false)
    if (!isControlled) setInternalLoading(true)
    try {
      await onContinue()
    } finally {
      // If onContinue navigated away, this component is already unmounting —
      // updating state here is a harmless no-op in that case.
      if (!isControlled) setInternalLoading(false)
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-6">
      <div aria-live="assertive">
        {showWarning && validationMessage && (
          <p role="alert" className="mb-4 text-right text-label font-medium text-danger">
            {validationMessage}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => backHref && router.push(backHref)}
          disabled={!backHref || loading}
          className="-ml-3 text-muted-foreground disabled:opacity-0"
        >
          ← Back
        </Button>

        <div className="flex items-center gap-2">
          {showSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip} disabled={loading} className="text-muted-foreground">
              Skip
            </Button>
          )}
          <Button
            onClick={handleContinue}
            disabled={loading}
            aria-disabled={!canContinue || undefined}
            // Stays clickable while incomplete so the message above can explain why.
            className={cn("min-w-28 aria-disabled:pointer-events-auto aria-disabled:cursor-pointer", shake && "animate-shake")}
          >
            {loading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {loading ? "Saving…" : continueLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
