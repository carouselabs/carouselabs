// components/history/HistoryCard.tsx
"use client"

import { useRouter } from "next/navigation"
import { Pin, Trash2, Copy, RotateCcw, ArrowRight, Loader2 } from "lucide-react"
import { ProgressBadge } from "./ProgressBadge"
import { continueHref, type HistoryEntry } from "@/lib/hooks/useHistory"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CATEGORY_PILL, PILL } from "@/components/shared/categoryTone"

const ICON_BUTTON = "text-muted-foreground hover:text-foreground"

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
  isDuplicating?: boolean
}

export function HistoryCard({ entry, onPin, onDelete, onDuplicate, isDuplicating = false }: HistoryCardProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-2.5 py-5">
      {/* Top row: pills + pin */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn(PILL, CATEGORY_PILL[entry.idea.category])}>{entry.idea.category}</span>
          <ProgressBadge status={entry.status} />
          {entry.hasDraft && (
            <span className={cn(PILL, "border border-success/25 bg-success-soft text-success")}>
              Draft saved
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPin(entry.ideaId, !entry.isPinned)}
          title={entry.isPinned ? "Unpin" : "Pin to top"}
          aria-label={entry.isPinned ? "Unpin" : "Pin to top"}
          aria-pressed={entry.isPinned}
          className={cn("-mt-1.5 -mr-1.5", entry.isPinned ? "bg-surface-muted text-foreground" : ICON_BUTTON)}
        >
          <Pin className={cn(entry.isPinned && "fill-current")} aria-hidden />
        </Button>
      </div>

      {/* Hook */}
      <h3 className="text-body font-semibold text-pretty text-foreground md:text-body-lg">
        {entry.idea.hook}
      </h3>

      {/* Caption preview — always shown, one line, so rows never shift
          under the pointer (it used to appear on hover and push the list). */}
      {entry.captionPreview && (
        <p className="line-clamp-1 text-label text-muted-foreground italic">
          “{entry.captionPreview}…”
        </p>
      )}

      {/* Footer: time + actions */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-0.5">
        <span className="text-caption text-muted-foreground">
          Last visited {timeAgo(entry.lastVisitedAt)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDuplicate(entry.ideaId)}
            disabled={isDuplicating}
            title="Duplicate as new session"
            aria-label="Duplicate as new session"
            className={ICON_BUTTON}
          >
            {isDuplicating ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push(`/idea/${entry.ideaId}`)}
            title="Start over from breakdown"
            aria-label="Start over from breakdown"
            className={ICON_BUTTON}
          >
            <RotateCcw aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(entry.ideaId)}
            title="Delete from history"
            aria-label="Delete from history"
            className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden />
          </Button>
          <Button size="sm" onClick={() => router.push(continueHref(entry.status, entry.ideaId))} className="ml-1">
            Continue
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
