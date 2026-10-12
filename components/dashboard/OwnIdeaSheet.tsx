import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// "Work on Own Idea" as a sheet of ruled paper with a margin line: the way in
// for someone who already has the idea written down. Text sits on the rules
// (28px rhythm), so line-heights here are fixed at 28px.
export function OwnIdeaSheet({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/own-idea"
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-card border border-border bg-surface-raised pr-4 pl-14 shadow-card transition-shadow duration-(--motion-fast) hover:shadow-popover md:pr-6 md:pl-16",
        compact ? "py-3.5" : "py-7"
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 27px, var(--border) 27px 28px)",
          backgroundPosition: compact ? "0 14px" : "0 0",
        }}
      />
      <span
        aria-hidden
        className="absolute inset-y-0 left-9 w-px bg-brand/45 transition-colors duration-(--motion-fast) group-hover:bg-brand md:left-11"
      />
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className={cn("font-display text-foreground", compact ? "text-[1.375rem]/[28px]" : "text-[1.75rem]/[28px]")}>
          Work on Own Idea
        </span>
        <span className="text-label leading-[28px] text-muted-foreground">
          Already know what to post? Skip trending and build from your own idea.
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative grid shrink-0 place-items-center rounded-full bg-foreground text-background transition-colors duration-(--motion-fast) group-hover:bg-brand group-hover:text-brand-foreground",
          compact ? "size-9" : "size-11"
        )}
      >
        <ArrowRight className="size-4 transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  )
}
