"use client"

import * as React from "react"
import { AlertCircle, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Shown next to the task that failed. Offer retry only when it is safe —
 * never auto-retry an action that spends credits or money.
 */
function ErrorState({
  title = "That didn't work",
  description,
  onRetry,
  retryLabel = "Try again",
  retryPending = false,
  details,
  announce = false,
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  onRetry?: () => void
  retryLabel?: string
  retryPending?: boolean
  /** Technical detail, collapsed by default. */
  details?: React.ReactNode
  /** Announce immediately (use when the error appears after an action). */
  announce?: boolean
  className?: string
}) {
  return (
    <div
      role={announce ? "alert" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-[color-mix(in_oklab,var(--danger),transparent_70%)] bg-danger-soft p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-body font-semibold text-foreground">{title}</p>
          {description && <p className="text-label text-muted-foreground">{description}</p>}
        </div>
      </div>
      {(onRetry || details) && (
        <div className="flex flex-col gap-3 pl-8">
          {onRetry && (
            <div>
              <Button variant="outline" size="sm" onClick={onRetry} pending={retryPending}>
                <RotateCcw aria-hidden />
                {retryLabel}
              </Button>
            </div>
          )}
          {details && (
            <details className="text-caption text-muted-foreground">
              <summary className="cursor-pointer select-none">Technical details</summary>
              <div className="mt-2 font-mono break-all">{details}</div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

export { ErrorState }
