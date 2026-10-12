import * as React from "react"

import { cn } from "@/lib/utils"

/** The one header every app and admin page uses: title, context, actions. */
function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  divider = false,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  /** Rendered under the title row, e.g. tabs. */
  children?: React.ReactNode
  divider?: boolean
  className?: string
}) {
  return (
    <header
      className={cn("flex flex-col gap-4", divider && "border-b border-border pb-6", className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow && <p className="text-label font-medium text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-title-sm font-semibold text-foreground sm:text-title">{title}</h1>
          {description && (
            <p className="max-w-[40rem] text-body text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export { PageHeader }
