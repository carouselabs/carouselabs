"use client"

import { Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { GenerateBar } from "@/components/dashboard/GenerateBar"
import { IdeaFeed } from "@/components/dashboard/IdeaFeed"
import { useIdeaSessionStore } from "@/lib/store/ideaSessionStore"
import type { SessionIdea } from "@/lib/store/ideaSessionStore"

// API response shape from /api/ideas/generate and /api/ideas/more
interface IdeaApiResponse {
  ideas: Omit<SessionIdea, "batchPosition">[]
  remaining?: number
  error?: string
}

export default function DashboardPage() {
  const {
    ideas,
    topicInput,
    isGenerating,
    isLoadingMore,
    error,
    setTopicInput,
    addIdeas,
    togglePin,
    dismissIdea,
    setGenerating,
    setLoadingMore,
    setError,
    clearIdeas,
  } = useIdeaSessionStore()

  // ── Generate ──────────────────────────────────────────────────
  async function handleGenerate() {
    if (isGenerating) return
    setGenerating(true)
    setError(null)
    clearIdeas()

    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicInput.trim() || null }),
      })
      const data: IdeaApiResponse = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate ideas")
      addIdeas(data.ideas)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setGenerating(false)
    }
  }

  // ── Load More ─────────────────────────────────────────────────
  async function handleLoadMore() {
    if (isLoadingMore || ideas.length >= 30) return
    setLoadingMore(true)
    setError(null)

    try {
      const res = await fetch("/api/ideas/more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicInput.trim() || null,
          alreadyShown: ideas.map((i) => i.hook),
        }),
      })
      const data: IdeaApiResponse = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load more ideas")
      addIdeas(data.ideas)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Pin (optimistic) ──────────────────────────────────────────
  async function handlePin(id: string) {
    togglePin(id)
    try {
      await fetch(`/api/ideas/${id}/pin`, { method: "PATCH" })
    } catch {
      togglePin(id) // revert on failure
    }
  }

  // ── Dismiss (optimistic) ──────────────────────────────────────
  async function handleDismiss(id: string) {
    dismissIdea(id)
    try {
      await fetch(`/api/ideas/${id}/dismiss`, { method: "PATCH" })
    } catch {
      // silently fail — dismissed in UI regardless
    }
  }

  // ── Render states ─────────────────────────────────────────────
  const hasIdeas = ideas.length > 0
  // Bar sits at the bottom while empty; once generating/has results it flies
  // to the top and the ideas drop in beneath it.
  const barOnTop = hasIdeas || isGenerating

  return (
    <div className="relative h-full">
      <div className="relative z-10 h-full max-w-2xl mx-auto flex flex-col">
        {/* Scrollable region — ideas drop in here (scrollbar hidden) */}
        <div className="order-2 flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-3 py-1">
          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
              {error}
            </div>
          )}

          {/* Generating skeleton */}
          {isGenerating && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[88px] rounded-xl bg-[#F4F2EC] border border-[#F1EFE9] animate-pulse"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}
            </div>
          )}

          {/* Idea feed */}
          {!isGenerating && hasIdeas && (
            <IdeaFeed
              ideas={ideas}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              onPin={handlePin}
              onDismiss={handleDismiss}
            />
          )}

          {/* Empty state — centered */}
          {!isGenerating && !hasIdeas && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <motion.div
                initial={{ opacity: 0, y: -20, rotateX: -25, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                style={{ transformPerspective: 800 }}
                className="w-14 h-14 rounded-2xl bg-white border border-[#E5E3DE] shadow-[0_10px_28px_rgba(10,10,10,0.06)] flex items-center justify-center"
              >
                <Sparkles size={22} className="text-[#1A1A1A]" strokeWidth={1.8} />
              </motion.div>
              <div className="flex flex-col gap-1">
                <p className="text-[16px] font-semibold text-[#0A0A0A]">
                  Generate your first ideas
                </p>
                <p className="text-[13px] text-[#9CA3AF] max-w-xs">
                  Type a topic in the bar below, or leave it blank to let AI pick based on your
                  profile.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Generate bar — flies to the top when results appear, sits at the
            bottom when empty (framer animates the move) */}
        <motion.div
          layout="position"
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          style={{ transformPerspective: 1000 }}
          className={`flex-shrink-0 ${barOnTop ? "order-1 pb-3" : "order-3 pt-3"}`}
        >
          <GenerateBar
            value={topicInput}
            onChange={setTopicInput}
            onGenerate={handleGenerate}
            isLoading={isGenerating}
          />
        </motion.div>
      </div>
    </div>
  )
}
