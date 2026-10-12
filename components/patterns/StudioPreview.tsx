import * as React from "react"
import { Newspaper } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A static, non-interactive composition of the studio journey — selected
 * idea, drafted caption, carousel — for marketing visuals. It renders on the
 * server, holds no links or buttons, and uses example content only. Wrap it
 * in ProductFrame with label="Example".
 */
function StudioPreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("grid gap-4 bg-background p-4 sm:grid-cols-[1.05fr_1fr] sm:p-6", className)}
    >
      {/* Left: the selected idea and its caption */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-card border border-brand bg-surface p-4 shadow-[inset_0_0_0_1px_var(--brand)]">
          <p className="flex items-center gap-1.5 text-caption font-medium text-brand">
            <Newspaper className="size-3.5" />
            Latest News · List post
          </p>
          <p className="mt-2 text-label font-medium text-foreground">
            Your users don&apos;t leave on day one. They leave on day two.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption font-medium text-muted-foreground">Caption</p>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-caption text-foreground">
              Conversational
            </span>
          </div>
          <div className="flex flex-col gap-2 text-label text-foreground">
            <p>Your users don&apos;t leave on day one. They leave on day two.</p>
            <p className="text-muted-foreground">Three small changes that make day two worth coming back for:</p>
            <p>1. Send one useful email, not five.</p>
            <p>2. Show the first win before asking for anything.</p>
            <p className="text-muted-foreground">3. Make the next step obvious…</p>
          </div>
        </div>
      </div>

      {/* Right: carousel slides, fanned */}
      <div className="relative mr-5 mb-3 min-h-56 sm:min-h-0">
        {/* Slides 3 and 2 peek out behind slide 1 */}
        <div className="absolute inset-0 translate-x-5 translate-y-3 rotate-[5deg] rounded-card border border-border bg-surface-muted" />
        <div className="absolute inset-0 translate-x-2.5 translate-y-1 rotate-[2.5deg] rounded-card border border-border bg-surface shadow-card" />
        <div className="relative flex h-full flex-col justify-between gap-6 rounded-card bg-primary p-5 text-primary-foreground shadow-popover">
          <div className="flex items-center justify-between text-caption opacity-70">
            <span>CarouseLabs</span>
            <span className="tabular-nums">1 / 8</span>
          </div>
          <p className="font-display text-title-sm leading-tight sm:text-title">
            Day two decides everything.
          </p>
          <p className="text-caption opacity-70">Swipe for the three fixes →</p>
        </div>
      </div>
    </div>
  )
}

export { StudioPreview }
