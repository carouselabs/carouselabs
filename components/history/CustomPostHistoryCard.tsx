// components/history/CustomPostHistoryCard.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Copy, Loader2 } from "lucide-react"
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
// ThumbnailHistoryCard — this is otherwise display-only: no pin/delete, just
// a preview of what was saved and when. "Duplicate" is the one action that
// makes sense here — it hands off to Content Hub's existing "pick content"
// deep link (see app/(app)/content-hub/_client.tsx's openNewPanelForPost)
// with a fresh copy pre-selected, ready for a new date/time or platform.
export function CustomPostHistoryCard({ entry }: CustomPostHistoryCardProps) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault()
    if (duplicating) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/content-hub/posts/${entry.id}/duplicate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error()
      router.push(`/content-hub?postId=${(data as { postId: string }).postId}`)
    } catch {
      setDuplicating(false)
    }
  }

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
        <div className="flex items-start justify-between gap-3">
          <span className="self-start text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-white bg-[#0A0A0A]">
            Custom
          </span>
          <button
            onClick={(e) => void handleDuplicate(e)}
            disabled={duplicating}
            title="Duplicate"
            className="flex-shrink-0 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#ECEAE4] transition-colors cursor-pointer disabled:opacity-50"
          >
            {duplicating ? <Loader2 size={13} className="animate-spin" strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
          </button>
        </div>

        <p className="text-[13px] text-[#374151] leading-[1.4] line-clamp-2">
          {entry.caption?.trim() || "No caption"}
        </p>

        <span className="text-[11px] text-[#ADA99F] mt-auto">Created {timeAgo(entry.createdAt)}</span>
      </div>
    </div>
  )
}
