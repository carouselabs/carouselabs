// components/history/ThumbnailHistoryCard.tsx
"use client"

import { useState } from "react"
import { Download, Loader2, ImageIcon } from "lucide-react"
import type { ThumbnailHistoryEntry } from "@/lib/hooks/useHistory"

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

interface ThumbnailHistoryCardProps {
  entry: ThumbnailHistoryEntry
}

// Thumbnail generations have no Idea/breakdown behind them, so there's no
// multi-step "Continue" flow to resume — this card is display-only: a
// preview of the result, the topic it was based on, and a way to view/save
// the full image. No pin/delete/duplicate (not wired up for standalone Posts
// yet), which is fine — thumbnails aren't part of the idea pipeline these
// actions were built around.
export function ThumbnailHistoryCard({ entry }: ThumbnailHistoryCardProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    if (!entry.imageUrl) return
    setDownloading(true)
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(entry.imageUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `thumbnail-${entry.id}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(entry.imageUrl, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <a
      href={entry.imageUrl || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex gap-4 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] hover:border-[rgba(26,26,26,0.3)] hover:bg-[rgba(26,26,26,0.04)] transition-all duration-150"
    >
      <div className="shrink-0 w-24 aspect-video rounded-lg overflow-hidden border border-[#E5E3DE] bg-white">
        {entry.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={entry.imageUrl}
            alt="Generated thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={16} className="text-[#ADA99F]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-[#7C3AED] bg-[rgba(124,58,237,0.1)]">
            Thumbnail
          </span>
          <button
            onClick={(e) => void handleDownload(e)}
            disabled={downloading}
            title="Download"
            className="flex-shrink-0 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#ECEAE4] transition-colors cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin" strokeWidth={2} />
            ) : (
              <Download size={13} strokeWidth={2} />
            )}
          </button>
        </div>

        <p className="text-[13px] text-[#374151] leading-[1.4] line-clamp-2">
          {entry.videoContent || "Untitled thumbnail"}
        </p>

        <span className="text-[11px] text-[#ADA99F] mt-auto">
          Generated {timeAgo(entry.createdAt)}
        </span>
      </div>
    </a>
  )
}
