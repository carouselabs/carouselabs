// components/pinned/PinnedCard.tsx
"use client"

import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import type { RawCategory } from "@/lib/ai/parsers/ideas"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CATEGORY_PILL, PILL } from "@/components/shared/categoryTone"

export interface PinnedIdea {
  id: string
  hook: string
  category: RawCategory
  pinnedAt: string
}

function pinnedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return "Pinned today"
  if (days === 1) return "Pinned yesterday"
  if (days < 30) return `Pinned ${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `Pinned ${months} month${months > 1 ? "s" : ""} ago`
  const years = Math.floor(months / 12)
  return `Pinned ${years} year${years > 1 ? "s" : ""} ago`
}

interface PinnedCardProps {
  idea: PinnedIdea
  onRemove: (id: string) => void
}

export function PinnedCard({ idea, onRemove }: PinnedCardProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Category + pinned time */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={cn(PILL, CATEGORY_PILL[idea.category])}>{idea.category}</span>
          <span className="text-caption text-muted-foreground">{pinnedAgo(idea.pinnedAt)}</span>
        </div>

        {/* Hook — the focal point */}
        <h3 className="text-body font-semibold text-pretty text-foreground md:text-body-lg">
          {idea.hook}
        </h3>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onRemove(idea.id)} className="text-muted-foreground hover:text-foreground">
          Remove
        </Button>
        <Button size="sm" onClick={() => router.push(`/idea/${idea.id}`)}>
          Generate now
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
