"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Bookmark, Building2, Newspaper, Shuffle, TrendingUp, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"

type IdeaCategory = "news" | "trending" | "industry" | "random"

const categories: Record<IdeaCategory, { label: string; icon: React.ReactNode }> = {
  news: { label: "Latest News", icon: <Newspaper aria-hidden /> },
  trending: { label: "Trending", icon: <TrendingUp aria-hidden /> },
  industry: { label: "Industry", icon: <Building2 aria-hidden /> },
  random: { label: "Something different", icon: <Shuffle aria-hidden /> },
}

/**
 * Presentational idea card: the hook is the main link (the whole card is
 * clickable), Pin and Dismiss are always-visible buttons — never hover-only.
 * Data, pinning and dismissal stay with the caller.
 */
function IdeaCard({
  category,
  hook,
  postType,
  href,
  pinned = false,
  selected = false,
  onPinnedChange,
  onDismiss,
  className,
}: {
  category: IdeaCategory
  hook: string
  postType?: string
  href: string
  pinned?: boolean
  selected?: boolean
  onPinnedChange?: (pinned: boolean) => void
  onDismiss?: () => void
  className?: string
}) {
  const cat = categories[category]
  return (
    <article
      data-selected={selected || undefined}
      className={cn(
        "group/idea relative flex flex-col gap-4 rounded-card border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-(--motion-fast) ease-standard hover:border-control-border hover:shadow-card data-selected:border-brand data-selected:shadow-[inset_0_0_0_1px_var(--brand)]",
        className
      )}
    >
      <div className="flex items-center gap-2 text-caption font-medium text-muted-foreground [&_svg]:size-3.5">
        <span className={cn("inline-flex items-center gap-1.5", category === "news" && "text-brand")}>
          {cat.icon}
          {cat.label}
        </span>
        {postType && (
          <>
            <span aria-hidden>·</span>
            <span>{postType}</span>
          </>
        )}
      </div>

      <h3 className="text-body font-medium text-pretty text-foreground">
        <Link href={href} className="after:absolute after:inset-0 after:rounded-card after:content-['']">
          {hook}
        </Link>
      </h3>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-label font-medium text-foreground" aria-hidden>
          Use this idea
          <ArrowRight className="size-4 transition-transform duration-(--motion-fast) group-hover/idea:translate-x-0.5" />
        </span>
        <div className="flex items-center gap-1">
          {onPinnedChange && (
            <Tooltip content={pinned ? "Unpin" : "Pin for later"}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={pinned ? "Unpin idea" : "Pin idea"}
                aria-pressed={pinned}
                onClick={() => onPinnedChange(!pinned)}
                className={cn(pinned && "text-brand")}
              >
                <Bookmark className={cn(pinned && "fill-current")} />
              </Button>
            </Tooltip>
          )}
          {onDismiss && (
            <Tooltip content="Dismiss">
              <Button variant="ghost" size="icon-sm" aria-label="Dismiss idea" onClick={onDismiss}>
                <XIcon />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </article>
  )
}

export { IdeaCard }
export type { IdeaCategory }
