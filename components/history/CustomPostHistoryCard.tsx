// components/history/CustomPostHistoryCard.tsx
"use client"

import { ImageIcon } from "lucide-react"
import type { CustomPostHistoryEntry } from "@/lib/hooks/useHistory"

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

interface CustomPostHistoryCardProps {
  entry: CustomPostHistoryEntry
}

// Custom Posts have no Idea/breakdown behind them, so — like
// ThumbnailHistoryCard — this is display-only: no pin/delete/duplicate,
// just a preview of what was saved and when. Scheduling/rescheduling a
// custom post happens from Content Hub, not from History.
export function CustomPostHistoryCard({ entry }: CustomPostHistoryCardProps) {
  return (
    <div className="group relative flex gap-4 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]">
      <div className="shrink-0 w-24 aspect-square rounded-lg overflow-hidden border border-[#E5E3DE] bg-white">
        {entry.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={entry.imageUrl} alt="Custom post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={16} className="text-[#ADA99F]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <span className="self-start text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-white bg-[#0A0A0A]">
          Custom
        </span>

        <p className="text-[13px] text-[#374151] leading-[1.4] line-clamp-2">
          {entry.caption?.trim() || "No caption"}
        </p>

        <span className="text-[11px] text-[#ADA99F] mt-auto">Created {timeAgo(entry.createdAt)}</span>
      </div>
    </div>
  )
}
