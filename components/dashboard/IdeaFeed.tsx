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
        {visible.map((idea, i) => (
          <motion.div
            key={idea.id}
            layout
            style={{ transformPerspective: 900 }}
            initial={{ opacity: 0, y: -55, rotateX: -30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.15 } }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 22,
              // Stagger per batch: each idea drops in a beat after the previous
              delay: idea.batchPosition * 0.07,
            }}
          >
            {/* Inner wrapper does a gentle, perpetual bob (separate transform
                context from the drop-in above, so they never fight) */}
            <div
              style={{
                animation: `floatSoft ${3.4 + (i % 4) * 0.4}s ease-in-out infinite ${(i % 5) * 0.25}s`,
              }}
            >
              <IdeaCard idea={idea} onPin={onPin} onDismiss={onDismiss} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Loading more skeleton rows */}
      {isLoadingMore && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Load More button */}
      {!atCap && total > 0 && !isLoadingMore && (
        <button
          onClick={onLoadMore}
          className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#E9E7E1] text-[13px] font-medium text-[#6B7280] hover:border-[#DEDBD4] hover:text-[#374151] hover:bg-[#F6F4EE] transition-all duration-150"
        >
          <RefreshCw size={13} strokeWidth={2.2} />
          Load more ideas
          <span className="text-[#ADA99F] text-[11px] tabular-nums">
            {total} / {SESSION_CAP}
          </span>
        </button>
      )}

      {/* Spinner while loading more (bottom of existing list) */}
      {isLoadingMore && (
        <div className="flex items-center justify-center gap-2 py-2 text-[12px] text-[#ADA99F]">
          <Loader2 size={13} className="animate-spin" />
          Generating more ideas…
        </div>
      )}

      {/* Session cap message */}
      {atCap && !isLoadingMore && (
        <div className="mt-2 flex flex-col items-center gap-1 py-4 text-center">
          <p className="text-[13px] text-[#9CA3AF]">
            You&apos;ve reached the {SESSION_CAP}-idea session limit.
          </p>
          <p className="text-[12px] text-[#ADA99F]">
            Click &ldquo;New session&rdquo; in the top bar to start fresh.
          </p>
        </div>
      )}
    </div>
  )
}
