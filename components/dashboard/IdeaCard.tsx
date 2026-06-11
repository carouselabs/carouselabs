"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, X } from "lucide-react"
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
    color: "#93C5FD",
    bg: "rgba(147,197,253,0.10)",
  },
  "Trending": {
    label: "Trending",
    color: "#6EE7B7",
    bg: "rgba(110,231,183,0.10)",
  },
  "Industry": {
    label: "Industry",
    color: "#C4B5FD",
    bg: "rgba(196,181,253,0.10)",
  },
  "Random": {
    label: "Random",
    color: "#FCD34D",
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

  function handleCardClick() {
    // Selecting an idea locks the session — confirm before committing.
    setConfirmOpen(true)
  }

  function handleConfirm() {
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
      className="group relative flex flex-col gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"
    >
      {/* Dismiss — top-right, visible on hover */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss idea"
        className="absolute top-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-[rgba(255,255,255,0.28)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.07)]"
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
      <p className="text-[14px] font-medium text-[rgba(255,255,255,0.88)] leading-[1.45] pr-5">
        {idea.hook}
      </p>

      {/* Post type + CTA */}
      <div className="flex items-center gap-2 flex-wrap mt-auto">
        <span className="text-[11px] text-[rgba(255,255,255,0.28)] tabular-nums">
          {idea.postType}
        </span>
        {idea.cta && (
          <>
            <span className="text-[rgba(255,255,255,0.12)]">·</span>
            <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
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
              ? "text-[#A78BFA]"
              : "text-[rgba(255,255,255,0.22)] hover:text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.06)]",
          )}
        >
          <Bookmark
            size={14}
            strokeWidth={2}
            fill={idea.isPinned ? "#A78BFA" : "none"}
          />
        </button>
      </div>
    </div>

    {/* Confirmation — selecting an idea locks the session */}
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="bg-[#0D0D1A] border-[rgba(255,255,255,0.08)] text-[#F0F0FA]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold text-[rgba(255,255,255,0.92)]">
            Ready to work on this idea?
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.55]">
            Once you select an idea, you&apos;ll be locked into it for this
            session. To pick a different idea, you&apos;ll need to start a new
            session.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => setConfirmOpen(false)}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
          >
            Let&apos;s go →
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
