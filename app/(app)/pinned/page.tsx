"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Bookmark, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/patterns/EmptyState"
import { PageHeader } from "@/components/patterns/PageHeader"
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Your Content Wishlist"
        description="Ideas saved for later. No session starts until you click Generate."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your wishlist…"
              aria-label="Search your wishlist…"
              density="compact"
              className="pl-9"
            />
          </div>
        }
      />

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <ul aria-hidden className="flex flex-col divide-y divide-border border-y border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-3 py-5">
              <Skeleton className="h-5 w-40 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
            </li>
          ))}
        </ul>
      )}

      {/* List */}
      {!loading && visible.length > 0 && (
        <ul aria-label="Pinned ideas" className="flex flex-col divide-y divide-border border-y border-border">
          {visible.map((idea) => (
            <li key={idea.id}>
              <PinnedCard idea={idea} onRemove={handleRemove} />
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && !error && (
        <EmptyState
          variant={ideas.length === 0 ? "first-use" : "no-results"}
          icon={<Bookmark aria-hidden />}
          title={ideas.length === 0 ? "No ideas pinned yet" : "Nothing matches"}
          description={
            ideas.length === 0
              ? "Go to Generate and pin ideas you want to save."
              : "Try a different search."
          }
        />
      )}
    </div>
  )
}
