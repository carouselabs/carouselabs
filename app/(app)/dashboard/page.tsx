"use client"

import { Sparkles } from "lucide-react"
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

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Generate Bar */}
      <GenerateBar
        value={topicInput}
        onChange={setTopicInput}
        onGenerate={handleGenerate}
        isLoading={isGenerating}
      />

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {/* Generating skeleton */}
      {isGenerating && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] animate-pulse"
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

      {/* Empty state */}
      {!isGenerating && !hasIdeas && !error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.18)] flex items-center justify-center">
            <Sparkles size={20} className="text-[#7C3AED]" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-[rgba(255,255,255,0.55)]">
              Generate your first ideas
            </p>
            <p className="text-[13px] text-[rgba(255,255,255,0.25)] max-w-xs">
              Type a topic above or leave it blank to let AI pick based on your profile.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
