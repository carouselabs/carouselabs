"use client"

import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

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

  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label="Onboarding progress"
        aria-valuemin={1}
        aria-valuemax={TOTAL}
        aria-valuenow={current}
        aria-valuetext={`Step ${current} of ${TOTAL}`}
        className="grid grid-cols-6 gap-1.5"
      >
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "h-1.5 rounded-full transition-colors duration-(--motion-panel)",
              i + 1 < current ? "bg-foreground" : i + 1 === current ? "bg-brand" : "bg-surface-muted"
            )}
          />
        ))}
      </div>
      <span className="text-caption text-muted-foreground tabular-nums">
        Step {current} of {TOTAL}
      </span>
    </div>
  )
}
