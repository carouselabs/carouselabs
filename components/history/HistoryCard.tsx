// components/history/HistoryCard.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pin, Trash2, Copy, RotateCcw, ArrowRight } from "lucide-react"
import { ProgressBadge } from "./ProgressBadge"
import { continueHref, type HistoryEntry } from "@/lib/hooks/useHistory"
import type { RawCategory } from "@/lib/ai/parsers/ideas"

const CATEGORY_COLORS: Record<RawCategory, { color: string; bg: string }> = {
  "Latest News": { color: "#2563EB", bg: "rgba(147,197,253,0.10)" },
  "Trending": { color: "#059669", bg: "rgba(110,231,183,0.10)" },
  "Industry": { color: "#1A1A1A", bg: "rgba(196,181,253,0.10)" },
  "Random": { color: "#D97706", bg: "rgba(252,211,77,0.10)" },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

interface HistoryCardProps {
  entry: HistoryEntry
  onPin: (ideaId: string, next: boolean) => void
  onDelete: (ideaId: string) => void
  onDuplicate: (ideaId: string) => void
}

export function HistoryCard({ entry, onPin, onDelete, onDuplicate }: HistoryCardProps) {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)
  const cat = CATEGORY_COLORS[entry.idea.category]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] hover:border-[rgba(26,26,26,0.3)] hover:bg-[rgba(26,26,26,0.04)] transition-all duration-150"
    >
      {/* Top row: pills + pin */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
            style={{ color: cat.color, backgroundColor: cat.bg }}
          >
            {entry.idea.category}
          </span>
          <ProgressBadge status={entry.status} />
          {entry.hasDraft && (
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-[#059669] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)]">
              Draft saved
            </span>
          )}
        </div>

        <button
          onClick={() => onPin(entry.ideaId, !entry.isPinned)}
          title={entry.isPinned ? "Unpin" : "Pin to top"}
          className={[
            "flex-shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer",
            entry.isPinned
              ? "text-[#1A1A1A] bg-[rgba(26,26,26,0.12)]"
              : "text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#ECEAE4]",
          ].join(" ")}
        >
          <Pin size={14} strokeWidth={2} fill={entry.isPinned ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Hook */}
      <h3 className="text-[14px] font-semibold text-[#0A0A0A] leading-[1.4]">
        {entry.idea.hook}
      </h3>

      {/* Caption preview on hover */}
      {hovered && entry.captionPreview && (
        <p className="text-[12px] text-[#9CA3AF] leading-[1.5] italic">
          “{entry.captionPreview}…”
        </p>
      )}

      {/* Footer: time + actions */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-[11px] text-[#ADA99F]">
          Last visited {timeAgo(entry.lastVisitedAt)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDuplicate(entry.ideaId)}
            title="Duplicate as new session"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#ECEAE4] transition-colors cursor-pointer"
          >
            <Copy size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => router.push(`/idea/${entry.ideaId}`)}
            title="Start over from breakdown"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#ECEAE4] transition-colors cursor-pointer"
          >
            <RotateCcw size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => onDelete(entry.ideaId)}
            title="Delete from history"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors cursor-pointer"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => router.push(continueHref(entry.status, entry.ideaId))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#000000] text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(26,26,26,0.2)] transition-colors cursor-pointer"
          >
            Continue
            <ArrowRight size={12} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}
