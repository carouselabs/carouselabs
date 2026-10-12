import * as React from "react"

import { cn } from "@/lib/utils"

/** "Step n of N" plus a segmented bar. `current` is 0-based. */
function StepProgress({
  steps,
  current,
  label = "Progress",
  showNames = false,
  className,
}: {
  steps: string[]
  current: number
  label?: string
  /** Show every step name under the bar (wide layouts). */
  showNames?: boolean
  className?: string
}) {
  const total = steps.length
  const index = Math.min(Math.max(current, 0), total - 1)
  return (
    <nav aria-label={label} className={cn("flex flex-col gap-2", className)}>
      <p className="text-label text-muted-foreground">
        <span className="font-medium text-foreground">
          Step {index + 1} of {total}
        </span>
        <span aria-hidden> · </span>
        <span>{steps[index]}</span>
      </p>
      <ol className={cn("grid gap-1.5", showNames && "gap-y-2")} style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {steps.map((step, i) => (
          <li key={step} aria-current={i === index ? "step" : undefined} className="flex flex-col gap-2">
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full transition-colors duration-(--motion-panel)",
                i < index ? "bg-foreground" : i === index ? "bg-brand" : "bg-surface-muted"
              )}
            />
            <span className={cn(showNames ? "text-caption text-muted-foreground" : "sr-only", i === index && "font-medium text-foreground")}>
              {step}
              {i < index && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export { StepProgress }
