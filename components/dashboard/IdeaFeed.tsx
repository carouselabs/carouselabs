"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2, RefreshCw } from "lucide-react"
import { IdeaCard } from "./IdeaCard"
import type { SessionIdea } from "@/lib/store/ideaSessionStore"

const SESSION_CAP = 30

interface IdeaFeedProps {
  // All ideas in the session (including dismissed) — used for cap calculation
  ideas: SessionIdea[]
  isLoadingMore: boolean
  onLoadMore: () => void
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

export function IdeaFeed({ ideas, isLoadingMore, onLoadMore, onPin, onDismiss }: IdeaFeedProps) {
  const visible = ideas.filter((i) => !i.isDismissed)
  const total = ideas.length
  const atCap = total >= SESSION_CAP

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {visible.map((idea) => (
          <motion.div
            key={idea.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={{
              duration: 0.22,
              ease: [0.25, 0.46, 0.45, 0.94],
              // Stagger per batch: each idea's position within its 10-idea batch
              delay: idea.batchPosition * 0.08,
            }}
          >
            <IdeaCard idea={idea} onPin={onPin} onDismiss={onDismiss} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Loading more skeleton rows */}
      {isLoadingMore && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Load More button */}
      {!atCap && total > 0 && !isLoadingMore && (
        <button
          onClick={onLoadMore}
          className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[rgba(255,255,255,0.07)] text-[13px] font-medium text-[rgba(255,255,255,0.45)] hover:border-[rgba(255,255,255,0.14)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.02)] transition-all duration-150"
        >
          <RefreshCw size={13} strokeWidth={2.2} />
          Load more ideas
          <span className="text-[rgba(255,255,255,0.22)] text-[11px] tabular-nums">
            {total} / {SESSION_CAP}
          </span>
        </button>
      )}

      {/* Spinner while loading more (bottom of existing list) */}
      {isLoadingMore && (
        <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-[rgba(255,255,255,0.28)]">
          <Loader2 size={13} className="animate-spin" />
          Generating more ideas…
        </div>
      )}

      {/* Session cap message */}
      {atCap && !isLoadingMore && (
        <div className="mt-2 flex flex-col items-center gap-1 py-4 text-center">
          <p className="text-[13px] text-[rgba(255,255,255,0.38)]">
            You&apos;ve reached the {SESSION_CAP}-idea session limit.
          </p>
          <p className="text-[12px] text-[rgba(255,255,255,0.22)]">
            Click &ldquo;New session&rdquo; in the top bar to start fresh.
          </p>
        </div>
      )}
    </div>
  )
}
