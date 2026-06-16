"use client"

import { useRouter } from "next/navigation"

interface StepNavProps {
  backHref?: string
  onContinue: () => void
  canContinue: boolean
  continueLabel?: string
  showSkip?: boolean
  onSkip?: () => void
  loading?: boolean
}

export function StepNav({
  backHref,
  onContinue,
  canContinue,
  continueLabel = "Continue",
  showSkip = false,
  onSkip,
  loading = false,
}: StepNavProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-[#E9E7E1]">
      <button
        onClick={() => backHref && router.push(backHref)}
        disabled={!backHref}
        className="px-5 py-2.5 text-sm text-[#6B7280] hover:text-[#0A0A0A] disabled:opacity-0 disabled:pointer-events-none transition-colors rounded-lg"
      >
        ← Back
      </button>

      <div className="flex items-center gap-3">
        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={loading}
            className="px-4 py-2.5 text-sm text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
          >
            Skip
          </button>
        )}
        <button
          onClick={onContinue}
          disabled={!canContinue || loading}
          className="px-6 py-2.5 text-sm font-medium text-white bg-[#1A1A1A] rounded-xl hover:bg-[#000000] disabled:opacity-35 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Saving…" : continueLabel}
        </button>
      </div>
    </div>
  )
}
