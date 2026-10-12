import * as React from "react"

import { cn } from "@/lib/utils"

export function Section({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("scroll-mt-24 border-t border-border py-14", className)}>
      <div className="mb-8 flex max-w-[44rem] flex-col gap-2">
        <h2 id={`${id}-title`} className="text-title-sm font-semibold text-foreground">
          {title}
        </h2>
        {description && <p className="text-body text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function Specimen({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      <p className="text-caption font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

/** Marks anything that is a proposal awaiting the owner's approval. */
export function PendingTag({ children = "Proposal · pending approval" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-dashed border-control-border px-2.5 text-caption font-medium text-muted-foreground">
      {children}
    </span>
  )
}
