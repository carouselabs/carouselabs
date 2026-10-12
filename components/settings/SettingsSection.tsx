// components/settings/SettingsSection.tsx
// One section of a Settings page laid out as a sheet: the title and its
// explanation in the left column (staying in view while a long section
// scrolls), the controls on the right. Stacks on phones.
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  /** Small control beside the title (e.g. a Preview link). */
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "grid gap-4 border-t border-border pt-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-x-12",
        className
      )}
    >
      <div className="flex flex-col gap-1.5 md:sticky md:top-6 md:self-start">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-body font-semibold text-foreground">{title}</h2>
          {action}
        </div>
        {description && <div className="text-label text-muted-foreground">{description}</div>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}
