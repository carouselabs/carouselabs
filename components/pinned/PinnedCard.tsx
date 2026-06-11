// components/pinned/PinnedCard.tsx
"use client"

import { useRouter } from "next/navigation"
import { Bookmark, ArrowRight } from "lucide-react"
import type { RawCategory } from "@/lib/ai/parsers/ideas"

const CATEGORY_COLORS: Record<RawCategory, { color: string; bg: string }> = {
  "Latest News": { color: "#93C5FD", bg: "rgba(147,197,253,0.10)" }, // blue
  "Trending": { color: "#6EE7B7", bg: "rgba(110,231,183,0.10)" }, // green
  "Industry": { color: "#C4B5FD", bg: "rgba(196,181,253,0.10)" }, // purple
  "Random": { color: "#FCD34D", bg: "rgba(252,211,77,0.10)" }, // amber
}

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
  const cat = CATEGORY_COLORS[idea.category]

  return (
    <div className="group relative flex flex-col gap-4 p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(124,58,237,0.35)] hover:bg-[rgba(124,58,237,0.04)] transition-all duration-150">
      {/* Top: category pill + pin marker */}
      <div className="flex items-start justify-between gap-3">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide"
          style={{ color: cat.color, backgroundColor: cat.bg }}
        >
          {idea.category}
        </span>
        <Bookmark size={15} className="text-[#A78BFA] flex-shrink-0" fill="#A78BFA" strokeWidth={1.8} />
      </div>

      {/* Hook — the focal point */}
      <h3 className="text-[17px] font-semibold text-[rgba(255,255,255,0.9)] leading-[1.4] tracking-[-0.2px]">
        {idea.hook}
      </h3>

      {/* Divider */}
      <div className="h-px bg-[rgba(255,255,255,0.05)] mt-auto" />

      {/* Footer: pinned time + actions */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-[rgba(255,255,255,0.35)]">
          {pinnedAgo(idea.pinnedAt)}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(idea.id)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            Remove
          </button>
          <button
            onClick={() => router.push(`/idea/${idea.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(124,58,237,0.2)] transition-colors"
          >
            Generate now
            <ArrowRight size={12} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}
