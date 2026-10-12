"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, Info, XIcon, OctagonAlert } from "lucide-react"

import { cn } from "@/lib/utils"

type BannerTone = "info" | "brand" | "success" | "warning" | "danger"

const tones: Record<BannerTone, { box: string; icon: React.ReactNode }> = {
  info: {
    box: "border-border bg-surface",
    icon: <Info className="size-4 text-muted-foreground" aria-hidden />,
  },
  brand: {
    box: "border-[color-mix(in_oklab,var(--brand),transparent_75%)] bg-brand-soft",
    icon: <span aria-hidden className="grid size-4 place-items-center"><span className="size-2 rounded-full bg-brand" /></span>,
  },
  success: {
    box: "border-[color-mix(in_oklab,var(--success),transparent_75%)] bg-success-soft",
    icon: <CheckCircle2 className="size-4 text-success" aria-hidden />,
  },
  warning: {
    box: "border-[color-mix(in_oklab,var(--warning),transparent_70%)] bg-warning-soft",
    icon: <AlertTriangle className="size-4 text-warning" aria-hidden />,
  },
  danger: {
    box: "border-[color-mix(in_oklab,var(--danger),transparent_70%)] bg-danger-soft",
    icon: <OctagonAlert className="size-4 text-danger" aria-hidden />,
  },
}

/**
 * Page-level notice (maintenance, plan limits, profile review, referral
 * reminder). Dismissal persistence stays with the caller.
 */
function Banner({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  dismissLabel = "Dismiss",
  live,
  className,
}: {
  tone?: BannerTone
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
  onDismiss?: () => void
  dismissLabel?: string
  /** "status" or "alert" only when the banner appears in response to something. */
  live?: "status" | "alert"
  className?: string
}) {
  const t = tones[tone]
  return (
    <div
      role={live}
      className={cn(
        "flex flex-col gap-3 rounded-control border px-4 py-3 text-label sm:flex-row sm:items-center",
        t.box,
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 shrink-0">{t.icon}</span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {children && <div className="mt-0.5 text-muted-foreground">{children}</div>}
        </div>
      </div>
      {(action || onDismiss) && (
        <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
          {action}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label={dismissLabel}
              className="relative inline-flex size-8 items-center justify-center rounded-control-sm text-muted-foreground transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-[color-mix(in_oklab,currentColor,transparent_90%)] hover:text-foreground"
            >
              <XIcon className="size-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { Banner }
