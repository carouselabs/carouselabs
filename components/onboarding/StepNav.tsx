"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

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
    <div>
      {showWarning && validationMessage && (
        <p className="mb-3 text-sm text-right text-red-600">{validationMessage}</p>
      )}
      <div className="flex items-center justify-between pt-8 mt-8 border-t border-[#E9E7E1]">
        <button
          onClick={() => backHref && router.push(backHref)}
          disabled={!backHref || loading}
          className="px-5 py-2.5 text-sm text-[#6B7280] hover:text-[#0A0A0A] disabled:opacity-0 disabled:pointer-events-none transition-colors rounded-lg"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          {showSkip && onSkip && (
            <button
              onClick={onSkip}
              disabled={loading}
              className="px-4 py-2.5 text-sm text-[#9CA3AF] hover:text-[#4B5563] transition-colors disabled:opacity-50"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={loading}
            aria-disabled={!canContinue}
            className={`min-w-[112px] flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-all ${
              canContinue ? "bg-[#1A1A1A] hover:bg-[#000000]" : "bg-[#1A1A1A] opacity-35"
            } ${loading ? "cursor-not-allowed" : "cursor-pointer"} ${shake ? "animate-shake" : ""}`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Saving…" : continueLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
