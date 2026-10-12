"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Loader2, RefreshCw } from "lucide-react"
import { IdeaCard } from "./IdeaCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { SessionIdea } from "@/lib/store/ideaSessionStore"

const SESSION_CAP = 30

interface IdeaFeedProps {
  // All ideas in the session (including dismissed) — used for cap calculation
  ideas: SessionIdea[]
  isLoadingMore: boolean
  selectedId: string | null
  onSelect: (id: string, viaKeyboard: boolean) => boolean
  onLoadMore: () => void
  onPin: (id: string) => void
  onDismiss: (id: string) => void
}

/** Placeholder rows in the list's own shape while ideas are on their way. */
export function IdeaRowsSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex gap-4 border-t border-border py-5" aria-hidden>
          <Skeleton className="h-5 w-6" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </li>
      ))}
    </>
  )
}

export function IdeaFeed({ ideas, isLoadingMore, selectedId, onSelect, onLoadMore, onPin, onDismiss }: IdeaFeedProps) {
  const reduceMotion = useReducedMotion()
  const visible = ideas.filter((i) => !i.isDismissed)
  const total = ideas.length
  const atCap = total >= SESSION_CAP

  return (
    <div className="flex flex-col">
      <ol aria-label="Ideas" className="flex flex-col">
        <AnimatePresence initial={!reduceMotion} mode="popLayout">
          {visible.map((idea, i) => (
            <motion.li
              key={idea.id}
              layout={reduceMotion ? false : "position"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{
                duration: reduceMotion ? 0 : 0.32,
                ease: [0.22, 1, 0.36, 1],
                // Stagger per batch: each idea arrives a beat after the previous
                delay: reduceMotion ? 0 : idea.batchPosition * 0.04,
              }}
            >
              <IdeaCard
                idea={idea}
                number={i + 1}
                isSelected={idea.id === selectedId}
                onSelect={onSelect}
                onPin={onPin}
                onDismiss={onDismiss}
              />
            </motion.li>
          ))}
        </AnimatePresence>

        {/* Loading more skeleton rows */}
        {isLoadingMore && <IdeaRowsSkeleton count={3} />}
      </ol>

      <div className="flex flex-col items-start gap-2 border-t border-border pt-5">
        {/* Load More button */}
        {!atCap && total > 0 && !isLoadingMore && (
          <Button variant="outline" onClick={onLoadMore}>
            <RefreshCw aria-hidden />
            Load more ideas
            <span className="text-caption font-normal text-muted-foreground tabular-nums">
              {total} / {SESSION_CAP}
            </span>
          </Button>
        )}

        {/* Spinner while loading more (bottom of existing list) */}
        {isLoadingMore && (
          <p role="status" className="flex items-center gap-2 text-label text-muted-foreground">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Generating more ideas…
          </p>
        )}

        {/* Session cap message */}
        {atCap && !isLoadingMore && (
          <div className="flex flex-col gap-0.5">
            <p className="text-label text-foreground">
              You&apos;ve reached the {SESSION_CAP}-idea session limit.
            </p>
            <p className="text-label text-muted-foreground">
              Click &ldquo;New session&rdquo; in the top bar to start fresh.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
