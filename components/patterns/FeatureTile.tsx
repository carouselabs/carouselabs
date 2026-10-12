import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A capability with a concrete explanation and, when it has one, a real
 * destination. `meta` says which product it belongs to (Studio, Engage for
 * LinkedIn, Free tool…).
 */
function FeatureTile({
  icon,
  title,
  description,
  meta,
  href,
  linkLabel = "Learn more",
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  meta?: React.ReactNode
  href?: string
  linkLabel?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-card border border-border bg-surface p-6", className)}>
      <div className="flex items-center justify-between gap-3">
        {icon && (
          <div className="grid size-10 place-items-center rounded-control bg-surface-muted text-foreground [&_svg]:size-5">
            {icon}
          </div>
        )}
        {meta && <span className="text-caption font-medium text-muted-foreground">{meta}</span>}
      </div>
      <h3 className="text-body-lg font-semibold text-foreground">{title}</h3>
      <p className="text-label text-muted-foreground">{description}</p>
      {href && (
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 pt-2 text-label font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

export { FeatureTile }
