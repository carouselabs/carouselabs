import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Marketing section heading. Pass a `<span className="font-display">` inside
 * `title` for the one editorial phrase a section may carry.
 */
function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  action,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  align?: "left" | "center"
  as?: "h1" | "h2" | "h3"
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex max-w-[44rem] flex-col gap-4",
        align === "center" && "mx-auto items-center text-center",
        className
      )}
    >
      {eyebrow && <p className="text-label font-medium text-brand">{eyebrow}</p>}
      <Heading className="text-section font-semibold text-balance text-foreground">{title}</Heading>
      {description && (
        <p className="max-w-[36rem] text-body-lg text-pretty text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2 flex flex-wrap gap-3">{action}</div>}
    </div>
  )
}

export { SectionHeader }
