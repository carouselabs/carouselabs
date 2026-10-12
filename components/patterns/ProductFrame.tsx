import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A neutral browser frame for product visuals (screenshots or live
 * presentational components). Neutral on purpose: the extensions are
 * Chrome-only, so the frame never suggests a specific browser.
 */
function ProductFrame({
  url = "app.carouselabs.com",
  label,
  chrome = true,
  className,
  bodyClassName,
  children,
}: {
  url?: string
  /** e.g. "Example" — shown when the content is demo data. */
  label?: React.ReactNode
  chrome?: boolean
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-showcase border border-border bg-surface-raised shadow-dialog",
        className
      )}
    >
      {chrome && (
        <div className="flex h-10 items-center gap-3 border-b border-border bg-surface-muted/60 px-4" aria-hidden>
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-control-border/50" />
            <span className="size-2.5 rounded-full bg-control-border/50" />
            <span className="size-2.5 rounded-full bg-control-border/50" />
          </div>
          <div className="mx-auto flex h-6 max-w-64 flex-1 items-center justify-center rounded-full bg-surface px-3 text-caption text-muted-foreground">
            <span className="truncate">{url}</span>
          </div>
          <span className="w-[42px]" />
        </div>
      )}
      <div className={cn("relative", bodyClassName)}>{children}</div>
      {label && (
        <figcaption className="absolute right-3 bottom-3 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-caption font-medium text-muted-foreground backdrop-blur-sm">
          {label}
        </figcaption>
      )}
    </figure>
  )
}

export { ProductFrame }
