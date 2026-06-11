// components/history/HistoryCard.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pin, Trash2, Copy, RotateCcw, ArrowRight } from "lucide-react"
import { ProgressBadge } from "./ProgressBadge"
import { continueHref, type HistoryEntry } from "@/lib/hooks/useHistory"
import type { RawCategory } from "@/lib/ai/parsers/ideas"

const CATEGORY_COLORS: Record<RawCategory, { color: string; bg: string }> = {
  "Latest News": { color: "#93C5FD", bg: "rgba(147,197,253,0.10)" },
  "Trending": { color: "#6EE7B7", bg: "rgba(110,231,183,0.10)" },
  "Industry": { color: "#C4B5FD", bg: "rgba(196,181,253,0.10)" },
  "Random": { color: "#FCD34D", bg: "rgba(252,211,77,0.10)" },
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
      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.04)] transition-all duration-150"
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
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-[#6EE7B7] bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.25)]">
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
              ? "text-[#A78BFA] bg-[rgba(124,58,237,0.12)]"
              : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)]",
          ].join(" ")}
        >
          <Pin size={14} strokeWidth={2} fill={entry.isPinned ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Hook */}
      <h3 className="text-[14px] font-semibold text-[rgba(255,255,255,0.85)] leading-[1.4]">
        {entry.idea.hook}
      </h3>

      {/* Caption preview on hover */}
      {hovered && entry.captionPreview && (
        <p className="text-[12px] text-[rgba(255,255,255,0.4)] leading-[1.5] italic">
          “{entry.captionPreview}…”
        </p>
      )}

      {/* Footer: time + actions */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
          Last visited {timeAgo(entry.lastVisitedAt)}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDuplicate(entry.ideaId)}
            title="Duplicate as new session"
            className="p-1.5 rounded-lg text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            <Copy size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => router.push(`/idea/${entry.ideaId}`)}
            title="Start over from breakdown"
            className="p-1.5 rounded-lg text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.65)] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            <RotateCcw size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => onDelete(entry.ideaId)}
            title="Delete from history"
            className="p-1.5 rounded-lg text-[rgba(255,255,255,0.32)] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors cursor-pointer"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => router.push(continueHref(entry.status, entry.ideaId))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(124,58,237,0.2)] transition-colors cursor-pointer"
          >
            Continue
            <ArrowRight size={12} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}
