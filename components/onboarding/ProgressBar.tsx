"use client"

import { usePathname } from "next/navigation"

const STEPS: Record<string, number> = {
  "/onboarding/identity": 1,
  "/onboarding/industry": 2,
  "/onboarding/topics": 3,
  "/onboarding/audience": 4,
  "/onboarding/goals": 5,
  "/onboarding/voice": 6,
}

const TOTAL = 6

export function ProgressBar() {
  const pathname = usePathname()
  const current = STEPS[pathname]

  if (!current) return null

  const pct = Math.round((current / TOTAL) * 100)

  return (
    <div className="w-full">
      <div className="h-[4px] w-full bg-[#E9E7E1]">
        <div
          className="h-full bg-[#1A1A1A] transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-end px-6 pt-2.5">
        <span className="text-xs text-[#9CA3AF] tabular-nums">
          Step {current} of {TOTAL}
        </span>
      </div>
    </div>
  )
}
