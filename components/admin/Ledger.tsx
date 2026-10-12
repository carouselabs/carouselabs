// A quiet row of figures — label, value, optional hint — separated by thin
// rules instead of boxed into identical cards. Used across the admin wherever
// several numbers sit side by side. A figure with `href` opens its page (the
// whole figure is the link). Server-safe: no hooks.
import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface LedgerItem {
  label: string
  value: ReactNode
  hint?: ReactNode
  href?: string
  /** A figure that isn't recorded yet: the value reads as a note, not a number. */
  pending?: boolean
}

export function Ledger({
  items,
  label,
  className,
  size = "md",
}: {
  items: LedgerItem[]
  /** Screen-reader name for the group, when no visible heading names it. */
  label?: string
  /** Column classes, e.g. "grid-cols-2 lg:grid-cols-4". */
  className?: string
  size?: "md" | "lg"
}) {
  return (
    <dl aria-label={label} className={cn("grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "relative flex min-w-0 flex-col gap-1 border-l border-border pl-4",
            item.href && "rounded-r-control-sm transition-colors duration-(--motion-fast) hover:border-brand focus-within:border-brand"
          )}
        >
          <dt className="text-caption font-medium text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "font-semibold text-foreground tabular-nums",
              item.pending ? "text-label text-muted-foreground" : size === "lg" ? "text-title-sm leading-none" : "text-lead"
            )}
          >
            {item.href ? (
              <Link
                href={item.href}
                aria-label={`${item.label}: ${typeof item.value === "string" || typeof item.value === "number" ? item.value : ""}`}
                className="outline-none! after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-control-sm focus-visible:after:outline-2 focus-visible:after:outline-brand"
              >
                {item.value}
              </Link>
            ) : (
              item.value
            )}
          </dd>
          {item.hint && <dd className="text-caption text-muted-foreground/80">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}
