"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, X, Loader2 } from "lucide-react"
import type { SessionIdea } from "@/lib/store/ideaSessionStore"
import type { RawCategory } from "@/lib/ai/parsers/ideas"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const CATEGORY_STYLES: Record<RawCategory, { label: string; className: string }> = {
  "Latest News": { label: "Latest News", className: "text-chart-4" },
  "Trending": { label: "Trending", className: "text-success" },
  "Industry": { label: "Industry", className: "text-foreground" },
  "Random": { label: "Random", className: "text-chart-3" },
}

// Selecting an idea locks the session — the same warning is shown in the
// desktop detail column and in the phone/tablet confirmation dialog.
const LOCK_TITLE = "Ready to work on this idea?"
const LOCK_COPY = (
  <>
    Once you select an idea, you&apos;ll be locked into it for this session. To pick a different idea,
    you&apos;ll need to start a new session.
  </>
)

function Meta({ idea, className }: { idea: SessionIdea; className?: string }) {
  const style = CATEGORY_STYLES[idea.rawCategory]
  return (
    <span className={cn("font-medium", className)}>
      <span className={style?.className}>{style?.label ?? idea.rawCategory}</span>
      <span className="text-muted-foreground tabular-nums"> · {idea.postType}</span>
    </span>
  )
}

function PinButton({ idea, onPin, withLabel = false }: { idea: SessionIdea; onPin: (id: string) => void; withLabel?: boolean }) {
  const label = idea.isPinned ? "Unpin idea" : "Pin idea"
  return (
    <Button
      variant={withLabel ? "outline" : "ghost"}
      size={withLabel ? "lg" : "icon-sm"}
      aria-label={withLabel ? undefined : label}
      aria-pressed={idea.isPinned}
      onClick={() => onPin(idea.id)}
      className={cn(!withLabel && "text-muted-foreground hover:text-foreground", idea.isPinned && "text-brand hover:text-brand")}
    >
      <Bookmark className={cn(idea.isPinned && "fill-current")} aria-hidden />
      {withLabel && label}
    </Button>
  )
}

/** Opens the idea page; navigating there starts the breakdown generation. */
function useOpenIdea(id: string) {
  const router = useRouter()
  // Generation can take a moment, so the button says it's working at once
  // instead of looking like the click did nothing.
  const [isNavigating, setIsNavigating] = useState(false)
  return {
    isNavigating,
    open: () => {
      setIsNavigating(true)
      router.push(`/idea/${id}`)
    },
  }
}

function GoButton({ isNavigating, onClick, size = "default" }: { isNavigating: boolean; onClick: () => void; size?: "default" | "lg" }) {
  return (
    <Button size={size} onClick={onClick} disabled={isNavigating} aria-busy={isNavigating || undefined} className="disabled:cursor-wait disabled:opacity-80">
      {isNavigating ? (
        <>
          <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
          Generating…
        </>
      ) : (
        <>Let&apos;s go →</>
      )}
    </Button>
  )
}

interface IdeaCardProps {
  idea: SessionIdea
  number: number
  /** Shown in the detail column (desktop). */
  isSelected: boolean
  /** Desktop: show it in the detail column. Returns false when there is no column. */
  onSelect: (id: string, viaKeyboard: boolean) => boolean
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

/** One idea in the numbered list. */
export function IdeaCard({ idea, number, isSelected, onSelect, onPin, onDismiss }: IdeaCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { isNavigating, open } = useOpenIdea(idea.id)

  return (
    <>
      <div
        className={cn(
          // Hover/selected fill bleeds 12px into the gutter; the divider stays on the content edge.
          "relative -mx-3 flex items-start gap-3 px-3 py-4 transition-colors duration-(--motion-fast) before:absolute before:inset-x-3 before:top-0 before:h-px before:bg-border hover:bg-surface md:gap-4 md:py-5",
          isSelected && "lg:bg-surface lg:shadow-[inset_2px_0_0_var(--brand)]"
        )}
      >
        <span className="w-6 shrink-0 pt-0.5 text-label text-muted-foreground tabular-nums md:w-7" aria-hidden>
          {String(number).padStart(2, "0")}
        </span>
        <button
          type="button"
          aria-current={isSelected ? "true" : undefined}
          onClick={(e) => {
            // No detail column on phones and tablets: confirm in a dialog instead.
            // (detail === 0: activated from the keyboard, not a pointer.)
            if (!onSelect(idea.id, e.detail === 0)) setConfirmOpen(true)
          }}
          className="flex min-w-0 flex-1 flex-col gap-1 rounded-detail text-left after:absolute after:inset-0 after:content-['']"
        >
          <Meta idea={idea} className="text-caption" />
          <span className="text-body font-medium text-pretty md:text-body-lg">{idea.hook}</span>
          {idea.cta && <span className="text-caption text-muted-foreground">CTA: {idea.cta}</span>}
        </button>
        <div className="relative z-10 -mt-1 -mr-1.5 flex shrink-0 items-center">
          <PinButton idea={idea} onPin={onPin} />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss idea"
            onClick={() => onDismiss(idea.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden />
          </Button>
        </div>
      </div>

      {/* Confirmation — selecting an idea locks the session */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{LOCK_TITLE}</DialogTitle>
            <DialogDescription>{LOCK_COPY}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isNavigating}>
              Cancel
            </Button>
            <GoButton isNavigating={isNavigating} onClick={open} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** The selected idea, with the session-lock warning and the way in (desktop). */
export function IdeaDetail({ idea, onPin }: { idea: SessionIdea; onPin: (id: string) => void }) {
  const { isNavigating, open } = useOpenIdea(idea.id)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Meta idea={idea} className="text-label" />
        <p className="text-title-sm font-semibold text-balance">{idea.hook}</p>
        {idea.cta && <p className="text-label text-muted-foreground">CTA: {idea.cta}</p>}
      </div>
      <div className="flex flex-col gap-1.5 border-t border-border pt-5">
        <h2 className="text-label font-semibold">{LOCK_TITLE}</h2>
        <p className="text-label text-muted-foreground">{LOCK_COPY}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GoButton isNavigating={isNavigating} onClick={open} size="lg" />
        <PinButton idea={idea} onPin={onPin} withLabel />
      </div>
    </div>
  )
}
