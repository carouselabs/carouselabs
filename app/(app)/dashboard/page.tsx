"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Pencil, ArrowRight, AlertCircle } from "lucide-react"
import { GenerateBar } from "@/components/dashboard/GenerateBar"
import { IdeaFeed, IdeaRowsSkeleton } from "@/components/dashboard/IdeaFeed"
import { IdeaDetail } from "@/components/dashboard/IdeaCard"
import { Skeleton } from "@/components/ui/skeleton"
import { ReferralReminderBanner } from "@/components/dashboard/ReferralReminderBanner"
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

  // Desktop shows the chosen idea beside the list; the first one until then.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

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
  const visible = ideas.filter((i) => !i.isDismissed)
  const selected = visible.find((i) => i.id === selectedId) ?? visible[0] ?? null
  // Before the first batch the brief sits under the welcome message;
  // once generating/has results it moves to the top of the workspace.
  const showIntro = !hasIdeas && !isGenerating

  // Desktop (detail column visible): select it there. Otherwise the row asks
  // for confirmation itself. Keyboard users are taken to the detail column.
  function handleSelect(id: string, viaKeyboard: boolean) {
    if (!window.matchMedia("(min-width: 64rem)").matches) return false
    setSelectedId(id)
    if (viaKeyboard) requestAnimationFrame(() => detailRef.current?.focus())
    return true
  }

  const errorBox = error && (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {error}
    </div>
  )

  const ownIdea = (
    <Link
      href="/own-idea"
      className="group flex items-center gap-3.5 rounded-control border border-dashed border-brand/40 bg-brand-soft/40 px-4 py-3.5 transition-colors duration-(--motion-fast) hover:border-brand hover:bg-brand-soft"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control-sm bg-brand-soft text-brand">
        <Pencil className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-label font-semibold text-foreground">Work on Own Idea</span>
        <span className="text-caption text-muted-foreground">
          Already know what to post? Skip trending and build from your own idea.
        </span>
      </span>
      <ArrowRight
        className="ml-auto size-4 shrink-0 text-brand transition-transform duration-(--motion-fast) group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )

  const brief = (
    <GenerateBar
      value={topicInput}
      onChange={setTopicInput}
      onGenerate={handleGenerate}
      isLoading={isGenerating}
    />
  )

  return (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-6 md:gap-8">
      <h1 className="sr-only">Generate</h1>

      {/* Weekly referral-program nudge — self-contained, renders nothing
          until it confirms it hasn't been shown yet this calendar week. */}
      {!isGenerating && <ReferralReminderBanner />}

      {showIntro ? (
        <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 pt-2 md:pt-[6vh]">
          {error ? (
            errorBox
          ) : (
            <div className="flex flex-col gap-2">
              <h2 className="text-title-sm font-semibold md:text-title">Generate your first ideas</h2>
              <p className="max-w-md text-body text-muted-foreground">
                Type a topic in the bar below, or leave it blank to let AI pick based on your
                profile.
              </p>
            </div>
          )}
          <div className="rounded-card border border-border bg-surface p-5 shadow-card md:p-6">{brief}</div>
          {ownIdea}
        </section>
      ) : (
        <>
          <div className="border-b border-border pb-6">{brief}</div>
          {errorBox}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] xl:gap-14">
            <div className="flex min-w-0 flex-col gap-5">
              {/* Work on Own Idea — always first, before trending ideas */}
              {!isGenerating && ownIdea}

              {isGenerating ? (
                <div role="status" aria-label="Generating…">
                  <ol aria-hidden className="flex flex-col">
                    <IdeaRowsSkeleton count={6} />
                  </ol>
                </div>
              ) : (
                <IdeaFeed
                  ideas={ideas}
                  isLoadingMore={isLoadingMore}
                  selectedId={selected?.id ?? null}
                  onSelect={handleSelect}
                  onLoadMore={handleLoadMore}
                  onPin={handlePin}
                  onDismiss={handleDismiss}
                />
              )}
            </div>

            {/* The chosen idea and the way in — desktop only; smaller screens
                confirm in a dialog from the row. */}
            <aside aria-label="Selected idea" className="hidden min-w-0 lg:block">
              <div
                ref={detailRef}
                tabIndex={-1}
                className="sticky top-6 rounded-card border border-border bg-surface p-6 shadow-card outline-none focus-visible:outline-2"
              >
                {isGenerating || !selected ? (
                  <div className="flex flex-col gap-3" aria-hidden>
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-4/5" />
                    <Skeleton className="mt-4 h-11 w-32" />
                  </div>
                ) : (
                  <IdeaDetail key={selected.id} idea={selected} onPin={handlePin} />
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
