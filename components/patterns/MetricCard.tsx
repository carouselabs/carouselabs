import * as React from "react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * One number with its label and context. A metric that failed to load shows
 * "Unavailable" — never a zero.
 */
function MetricCard({
  label,
  value,
  context,
  loading = false,
  failed = false,
  density = "default",
  className,
}: {
  label: React.ReactNode
  value?: React.ReactNode
  context?: React.ReactNode
  loading?: boolean
  failed?: boolean
  density?: "default" | "compact"
  className?: string
}) {
  const compact = density === "compact"
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-card border border-border bg-surface",
        compact ? "p-4" : "p-5",
        className
      )}
    >
      <p className="text-label text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className={cn("mt-1", compact ? "h-7 w-20" : "h-9 w-24")} />
      ) : failed ? (
        <p className="text-body font-medium text-muted-foreground">Unavailable</p>
      ) : (
        <p
          className={cn(
            "font-semibold tracking-[-0.02em] text-foreground tabular-nums",
            compact ? "text-title-sm" : "text-title"
          )}
        >
          {value}
        </p>
      )}
      {context && !loading && <p className="text-caption text-muted-foreground">{context}</p>}
    </div>
  )
}

export { MetricCard }
