"use client"

import { useEffect, useMemo, useState } from "react"
import { Bookmark, Search } from "lucide-react"
import { PinnedCard, type PinnedIdea } from "@/components/pinned/PinnedCard"

export default function PinnedPage() {
  const [ideas, setIdeas] = useState<PinnedIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/pinned")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load pinned ideas")
        if (active) setIdeas(data.pinned)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? ideas.filter((i) => i.hook.toLowerCase().includes(q)) : ideas
  }, [ideas, search])

  // Optimistically drop the card, then unpin server-side. Revert on failure.
  async function handleRemove(id: string) {
    const snapshot = ideas
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    try {
      const res = await fetch(`/api/ideas/${id}/pin`, { method: "PATCH" })
      if (!res.ok) throw new Error()
    } catch {
      setIdeas(snapshot)
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold text-[#0A0A0A] tracking-[-0.4px]">
          Your Content Wishlist
        </h1>
        <p className="text-[14px] text-[#6B7280] leading-[1.5]">
          Ideas saved for later. No session starts until you click Generate.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your wishlist…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[168px] rounded-2xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* Grid */}
      {!loading && visible.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((idea) => (
            <PinnedCard key={idea.id} idea={idea} onRemove={handleRemove} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[36vh] text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.18)] flex items-center justify-center">
            <Bookmark size={20} className="text-[#1A1A1A]" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-[#6B7280]">
              {ideas.length === 0 ? "No ideas pinned yet" : "Nothing matches"}
            </p>
            <p className="text-[13px] text-[#ADA99F] max-w-xs">
              {ideas.length === 0
                ? "Go to Generate and pin ideas you want to save."
                : "Try a different search."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
