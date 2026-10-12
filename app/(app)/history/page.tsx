"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Clock, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/patterns/EmptyState"
import { PageHeader } from "@/components/patterns/PageHeader"
import { HistoryCard } from "@/components/history/HistoryCard"
import { ThumbnailHistoryCard } from "@/components/history/ThumbnailHistoryCard"
import { CustomPostHistoryCard } from "@/components/history/CustomPostHistoryCard"
import {
  pinHistory,
  deleteHistory,
  duplicateIdea,
  type AnyHistoryEntry,
  type HistoryStatus,
} from "@/lib/hooks/useHistory"

type Filter = "All" | "Caption" | "Image" | "Carousel" | "Thumbnail" | "Custom"

const FILTERS: Filter[] = ["All", "Caption", "Image", "Carousel", "Thumbnail", "Custom"]

// Which statuses belong to each filter tab (idea-based entries only —
// Thumbnail and Custom are filtered separately below since neither has a
// HistoryStatus).
const FILTER_STATUSES: Record<Exclude<Filter, "All" | "Thumbnail" | "Custom">, HistoryStatus[]> = {
  Caption: ["CAPTION", "CAPTION_DONE"],
  Image: ["IMAGE", "IMAGE_DONE"],
  Carousel: ["CAROUSEL", "CAROUSEL_DONE"],
}

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AnyHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("All")
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

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

  // ── Filtering: search by hook/topic keyword + active filter tab ─
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      const matchesSearch =
        !q ||
        (e.kind === "idea" ? e.idea.hook : e.kind === "thumbnail" ? e.videoContent : (e.caption ?? ""))
          .toLowerCase()
          .includes(q)
      const matchesFilter =
        filter === "All"
          ? true
          : filter === "Thumbnail"
            ? e.kind === "thumbnail"
            : filter === "Custom"
              ? e.kind === "custom"
              : e.kind === "idea" && FILTER_STATUSES[filter].includes(e.status)
      return matchesSearch && matchesFilter
    })
  }, [entries, search, filter])

  // ── Actions (optimistic) — idea-based entries only; Thumbnail entries
  // aren't pinnable/deletable/duplicable (see ThumbnailHistoryCard). ──
  async function handlePin(ideaId: string, next: boolean) {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.kind === "idea" && e.ideaId === ideaId ? { ...e, isPinned: next } : e,
      )
      // Re-sort: pinned ideas first, then everything else by its own recency.
      return [...updated].sort((a, b) => {
        const aPinned = a.kind === "idea" && a.isPinned
        const bPinned = b.kind === "idea" && b.isPinned
        if (aPinned !== bPinned) return aPinned ? -1 : 1
        const ta = new Date(a.kind === "idea" ? a.lastVisitedAt : a.createdAt).getTime()
        const tb = new Date(b.kind === "idea" ? b.lastVisitedAt : b.createdAt).getTime()
        return tb - ta
      })
    })
    try {
      await pinHistory(ideaId, next)
    } catch {
      setEntries((prev) =>
        prev.map((e) => (e.kind === "idea" && e.ideaId === ideaId ? { ...e, isPinned: !next } : e)),
      )
    }
  }

  async function handleDelete(ideaId: string) {
    const snapshot = entries
    setEntries((prev) => prev.filter((e) => !(e.kind === "idea" && e.ideaId === ideaId)))
    try {
      await deleteHistory(ideaId)
    } catch {
      setEntries(snapshot) // revert on failure
    }
  }

  async function handleDuplicate(ideaId: string) {
    if (duplicatingId) return
    setDuplicatingId(ideaId)
    try {
      const newId = await duplicateIdea(ideaId)
      router.push(`/idea/${newId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate")
      setDuplicatingId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="History"
        description="Pick up exactly where you left off on any idea."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by idea keyword…"
              aria-label="Search by idea keyword…"
              density="compact"
              className="pl-9"
            />
          </div>
        }
      />

      {/* Filter tabs */}
      <div role="group" aria-label="Filter" className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="inline-flex h-9 shrink-0 items-center rounded-full border border-border px-3.5 text-label whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {f}
          </button>
        ))}
      </div>

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
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-3 py-5">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-32" />
            </li>
          ))}
        </ul>
      )}

      {/* List */}
      {!loading && visible.length > 0 && (
        <ul aria-label="History" className="flex flex-col divide-y divide-border border-y border-border">
          {visible.map((entry) => (
            <li key={entry.id}>
              {entry.kind === "idea" ? (
                <HistoryCard
                  entry={entry}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  isDuplicating={duplicatingId === entry.ideaId}
                />
              ) : entry.kind === "thumbnail" ? (
                <ThumbnailHistoryCard entry={entry} />
              ) : (
                <CustomPostHistoryCard entry={entry} />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && !error && (
        <EmptyState
          variant={entries.length === 0 ? "first-use" : "no-results"}
          icon={<Clock aria-hidden />}
          title={entries.length === 0 ? "No history yet" : "Nothing matches"}
          description={
            entries.length === 0
              ? "Open an idea and start generating — it'll show up here so you can continue anytime."
              : "Try a different search or filter."
          }
        />
      )}
    </div>
  )
}
