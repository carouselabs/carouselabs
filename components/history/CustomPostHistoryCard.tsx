// components/history/CustomPostHistoryCard.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Copy, Loader2 } from "lucide-react"
import type { CustomPostHistoryEntry } from "@/lib/hooks/useHistory"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PILL } from "@/components/shared/categoryTone"

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
    <div className="flex gap-4 py-5">
      <div className="aspect-square w-24 shrink-0 overflow-hidden rounded-control-sm border border-border bg-surface-raised sm:w-28">
        {entry.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={entry.imageUrl} alt="Custom post" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className={cn(PILL, "bg-foreground text-background")}>Custom</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => void handleDuplicate(e)}
            disabled={duplicating}
            title="Duplicate"
            aria-label="Duplicate"
            className="-mt-1.5 -mr-1.5 text-muted-foreground hover:text-foreground"
          >
            {duplicating ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
          </Button>
        </div>

        <p className="line-clamp-2 text-label text-foreground">
          {entry.caption?.trim() || "No caption"}
        </p>

        <span className="mt-auto text-caption text-muted-foreground">Created {timeAgo(entry.createdAt)}</span>
      </div>
    </div>
  )
}
