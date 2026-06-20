"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, X, Loader2 } from "lucide-react"
import type { SessionIdea } from "@/lib/store/ideaSessionStore"
import type { RawCategory } from "@/lib/ai/parsers/ideas"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const CATEGORY_STYLES: Record<RawCategory, { label: string; color: string; bg: string }> = {
  "Latest News": {
    label: "Latest News",
    color: "#2563EB",
    bg: "rgba(147,197,253,0.10)",
  },
  "Trending": {
    label: "Trending",
    color: "#059669",
    bg: "rgba(110,231,183,0.10)",
  },
  "Industry": {
    label: "Industry",
    color: "#1A1A1A",
    bg: "rgba(196,181,253,0.10)",
  },
  "Random": {
    label: "Random",
    color: "#D97706",
    bg: "rgba(252,211,77,0.10)",
  },
}

interface IdeaCardProps {
  idea: SessionIdea
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

export function IdeaCard({ idea, onPin, onDismiss }: IdeaCardProps) {
  const router = useRouter()
  const style = CATEGORY_STYLES[idea.rawCategory]
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Navigating to the idea page kicks off breakdown generation, which can take a
  // moment. Track it so the confirm button gives instant "working on it" feedback
  // instead of looking like the click did nothing.
  const [isNavigating, setIsNavigating] = useState(false)

  function handleCardClick() {
    // Selecting an idea locks the session — confirm before committing.
    setConfirmOpen(true)
  }

  function handleConfirm() {
    setIsNavigating(true)
    router.push(`/idea/${idea.id}`)
  }

  function handlePin(e: React.MouseEvent) {
    e.stopPropagation()
    onPin(idea.id)
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation()
    onDismiss(idea.id)
  }

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      className="group relative flex flex-col gap-3 p-4 rounded-xl bg-[#F4F2EC] border border-[#E9E7E1] hover:bg-[#ECEAE4] hover:border-[#E5E3DE] transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]/50"
    >
      {/* Dismiss — top-right, visible on hover */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss idea"
        className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-[#ADA99F] hover:text-[#374151] hover:bg-[#E9E7E1]"
      >
        <X size={13} strokeWidth={2.2} />
      </button>

      {/* Category pill */}
      <span
        className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
        style={{ color: style.color, backgroundColor: style.bg }}
      >
        {style.label}
      </span>

      {/* Hook */}
      <p className="text-[14px] font-medium text-[#0A0A0A] leading-[1.45] pr-5">
        {idea.hook}
      </p>

      {/* Post type + CTA */}
      <div className="flex items-center gap-2 flex-wrap mt-auto">
        <span className="text-[11px] text-[#ADA99F] tabular-nums">
          {idea.postType}
        </span>
        {idea.cta && (
          <>
            <span className="text-[#E5E3DE]">·</span>
            <span className="text-[11px] text-[#ADA99F]">
              CTA: {idea.cta}
            </span>
          </>
        )}

        {/* Pin — always visible, pushed to right */}
        <button
          onClick={handlePin}
          aria-label={idea.isPinned ? "Unpin idea" : "Pin idea"}
          className={cn(
            "ml-auto p-1.5 rounded-md transition-colors",
            idea.isPinned
              ? "text-[#1A1A1A]"
              : "text-[#ADA99F] hover:text-[#4B5563] hover:bg-[#E9E7E1]",
          )}
        >
          <Bookmark
            size={14}
            strokeWidth={2}
            fill={idea.isPinned ? "#1A1A1A" : "none"}
          />
        </button>
      </div>
    </div>

    {/* Confirmation — selecting an idea locks the session */}
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="bg-[#FFFFFF] border-[#E5E3DE] text-[#0A0A0A]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[#0A0A0A]">
            Ready to work on this idea?
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#6B7280] leading-[1.55]">
            Once you select an idea, you&apos;ll be locked into it for this
            session. To pick a different idea, you&apos;ll need to start a new
            session.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => setConfirmOpen(false)}
            disabled={isNavigating}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isNavigating}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all disabled:opacity-80 disabled:cursor-wait"
          >
            {isNavigating ? (
              <>
                <Loader2 size={14} strokeWidth={2.4} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>Let&apos;s go →</>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
