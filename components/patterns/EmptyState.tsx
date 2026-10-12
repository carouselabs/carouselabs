import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * "first-use": explain what belongs here and offer one action.
 * "no-results": smaller, for filters or searches that matched nothing.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "first-use",
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "first-use" | "no-results"
  className?: string
}) {
  const firstUse = variant === "first-use"
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 text-center",
        firstUse
          ? "rounded-card border border-dashed border-border bg-surface/60 px-6 py-12"
          : "px-4 py-8",
        className
      )}
    >
      {icon && firstUse && (
        <div className="mb-1 grid size-12 place-items-center rounded-control bg-surface-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className={cn("font-semibold text-foreground", firstUse ? "text-body-lg" : "text-body")}>
        {title}
      </p>
      {description && (
        <p className="max-w-[28rem] text-label text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
