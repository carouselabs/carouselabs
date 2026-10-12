// components/history/ThumbnailHistoryCard.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, ImageIcon, Copy } from "lucide-react"
import type { ThumbnailHistoryEntry } from "@/lib/hooks/useHistory"
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

interface ThumbnailHistoryCardProps {
  entry: ThumbnailHistoryEntry
}

// Thumbnail generations have no Idea/breakdown behind them, so there's no
// multi-step "Continue" flow to resume — this card is otherwise
// display-only: a preview of the result, the topic it was based on, and a
// way to view/save the full image. "Duplicate" hands off to Content Hub's
// existing "pick content" deep link (openNewPanelForPost) with a fresh copy
// pre-selected, ready for a new date/time or platform.
export function ThumbnailHistoryCard({ entry }: ThumbnailHistoryCardProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
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

  const text = entry.videoContent || "Untitled thumbnail"

  // The whole row opens the full image (new tab); the buttons sit above that link.
  return (
    <div className="group relative flex gap-4 py-5">
      <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-control-sm border border-border bg-surface-raised sm:w-32">
        {entry.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={entry.imageUrl}
            alt="Generated thumbnail"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <span className={cn(PILL, "bg-brand-soft text-brand")}>Thumbnail</span>
          <div className="relative z-10 -mt-1.5 -mr-1.5 flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => void handleDuplicate(e)}
              disabled={duplicating}
              title="Duplicate"
              aria-label="Duplicate"
              className="text-muted-foreground hover:text-foreground"
            >
              {duplicating ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => void handleDownload(e)}
              disabled={downloading}
              title="Download"
              aria-label="Download"
              className="text-muted-foreground hover:text-foreground"
            >
              {downloading ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            </Button>
          </div>
        </div>

        {entry.imageUrl ? (
          <a
            href={entry.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 rounded-detail text-label text-foreground underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline"
          >
            {text}
          </a>
        ) : (
          <p className="line-clamp-2 text-label text-foreground">{text}</p>
        )}

        <span className="mt-auto text-caption text-muted-foreground">
          Generated {timeAgo(entry.createdAt)}
        </span>
      </div>
    </div>
  )
}
