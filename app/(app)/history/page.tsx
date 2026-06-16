"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Search } from "lucide-react"
import { HistoryCard } from "@/components/history/HistoryCard"
import {
  pinHistory,
  deleteHistory,
  duplicateIdea,
  type HistoryEntry,
  type HistoryStatus,
} from "@/lib/hooks/useHistory"

type Filter = "All" | "Caption" | "Image" | "Carousel"

const FILTERS: Filter[] = ["All", "Caption", "Image", "Carousel"]

// Which statuses belong to each filter tab.
const FILTER_STATUSES: Record<Exclude<Filter, "All">, HistoryStatus[]> = {
  Caption: ["CAPTION", "CAPTION_DONE"],
  Image: ["IMAGE", "IMAGE_DONE"],
  Carousel: ["CAROUSEL", "CAROUSEL_DONE"],
}

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("All")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/history")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load history")
        if (active) setEntries(data.history)
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

  // ── Filtering: search by hook keyword + active filter tab ──────
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      const matchesSearch = !q || e.idea.hook.toLowerCase().includes(q)
      const matchesFilter =
        filter === "All" || FILTER_STATUSES[filter].includes(e.status)
      return matchesSearch && matchesFilter
    })
  }, [entries, search, filter])

  // ── Actions (optimistic) ───────────────────────────────────────
  async function handlePin(ideaId: string, next: boolean) {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.ideaId === ideaId ? { ...e, isPinned: next } : e,
      )
      // Re-sort: pinned first, then most recently visited.
      return [...updated].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime()
      })
    })
    try {
      await pinHistory(ideaId, next)
    } catch {
      setEntries((prev) =>
        prev.map((e) => (e.ideaId === ideaId ? { ...e, isPinned: !next } : e)),
      )
    }
  }

  async function handleDelete(ideaId: string) {
    const snapshot = entries
    setEntries((prev) => prev.filter((e) => e.ideaId !== ideaId))
    try {
      await deleteHistory(ideaId)
    } catch {
      setEntries(snapshot) // revert on failure
    }
  }

  async function handleDuplicate(ideaId: string) {
    try {
      const newId = await duplicateIdea(ideaId)
      router.push(`/idea/${newId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate")
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-bold text-[#0A0A0A]">History</h1>
        <p className="text-[13px] text-[#9CA3AF]">
          Pick up exactly where you left off on any idea.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by idea keyword…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
              filter === f
                ? "bg-[rgba(26,26,26,0.15)] text-[#1A1A1A] border border-[rgba(26,26,26,0.3)]"
                : "text-[#9CA3AF] border border-transparent hover:text-[#374151] hover:bg-[#F1EFE9]",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* List */}
      {!loading && visible.length > 0 && (
        <div className="flex flex-col gap-3">
          {visible.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              onPin={handlePin}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.18)] flex items-center justify-center">
            <Clock size={20} className="text-[#1A1A1A]" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-[#6B7280]">
              {entries.length === 0 ? "No history yet" : "Nothing matches"}
            </p>
            <p className="text-[13px] text-[#ADA99F] max-w-xs">
              {entries.length === 0
                ? "Open an idea and start generating — it'll show up here so you can continue anytime."
                : "Try a different search or filter."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
