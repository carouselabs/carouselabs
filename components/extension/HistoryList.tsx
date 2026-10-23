"use client"

// Extension → History: every generation the extension made — comments,
// replies, connection notes, messages — from the same route the side panel's
// History screen reads (app/api/ext/history). With platform="x" (Extension →
// X), CarouseLabs Engage for X's replies and messages instead.
import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { dateTime, errorMessage, extApi, type HistoryEntry, type HistoryKind } from "./api"
import type { EngagePlatform } from "@/lib/engage/features"

type Platform = EngagePlatform

const FILTERS: Record<Platform, { kind: HistoryKind | null; label: string }[]> = {
  linkedin: [
    { kind: null, label: "All" },
    { kind: "comment", label: "Comments" },
    { kind: "reply", label: "Replies" },
    { kind: "connection_note", label: "Connection notes" },
    { kind: "message", label: "Messages" },
  ],
  x: [
    { kind: null, label: "All" },
    { kind: "x_reply", label: "Replies" },
    { kind: "x_message", label: "Messages" },
  ],
  reddit: [
    { kind: null, label: "All" },
    { kind: "reddit_comment", label: "Comments" },
    { kind: "reddit_message", label: "Messages" },
  ],
}

const EMPTY: Record<Platform, string> = {
  linkedin: "Nothing here yet. Everything the extension writes for you on LinkedIn shows up here.",
  x: "Nothing here yet. Every reply and message CarouseLabs Engage for X writes for you shows up here.",
  reddit: "Nothing here yet. Every comment and message CarouseLabs Engage for Reddit writes for you shows up here.",
}

const KIND_LABELS: Record<HistoryKind, string> = {
  comment: "Comment",
  reply: "Reply",
  connection_note: "Connection note",
  message: "Message",
  x_reply: "Reply",
  x_message: "Message",
  reddit_comment: "Comment",
  reddit_message: "Message",
}

// Who the text was for, in each kind's own words.
function audience(entry: HistoryEntry): string {
  const name = entry.postAuthor || "someone"
  switch (entry.kind) {
    case "reply":
      return `Reply on ${name}'s post`
    case "x_reply":
    case "reddit_comment":
      return `Reply to ${name}`
    case "connection_note":
      return `Note to ${name}`
    case "message":
    case "x_message":
    case "reddit_message":
      return `Message to ${name}`
    default:
      return `Comment on ${name}'s post`
  }
}

const LINK_LABELS: Record<HistoryKind, string> = {
  comment: "View post",
  reply: "View post",
  connection_note: "View profile",
  message: "Open chat",
  x_reply: "View post",
  x_message: "Open chat",
  reddit_comment: "View post",
  reddit_message: "Open chat",
}

// Only real LinkedIn, X and Reddit pages are linked; anything else in
// postUrl is ignored.
const LINKED_HOSTS = new Set(["www.linkedin.com", "x.com", "www.reddit.com"])
function siteHref(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && LINKED_HOSTS.has(parsed.hostname) ? parsed.toString() : null
  } catch {
    return null
  }
}

const ACTION_LABELS: Record<HistoryEntry["action"], { label: string; className: string }> = {
  INSERTED: { label: "Inserted", className: "text-success bg-success-soft" },
  COPIED: { label: "Copied", className: "text-chart-4 bg-chart-4/10" },
  NONE: { label: "Not used", className: "text-muted-foreground bg-surface-muted" },
}

// Status dot colours, matching the labels above.
const ACTION_DOT: Record<HistoryEntry["action"], string> = {
  INSERTED: "bg-success",
  COPIED: "bg-chart-4",
  NONE: "bg-control-border",
}

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

/**
 * The selected generation shown as the exchange it was part of: the post (or
 * chat) it answered, then what the extension wrote, as the reply it became.
 */
function HistoryDetail({ entry, onDeleted }: { entry: HistoryEntry; onDeleted: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const href = siteHref(entry.postUrl)
  const action = ACTION_LABELS[entry.action] ?? ACTION_LABELS.NONE

  async function copy() {
    try {
      await navigator.clipboard.writeText(entry.comment)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Couldn't copy to clipboard")
    }
  }

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await extApi(`/api/ext/history/${entry.id}`, { method: "DELETE" })
      onDeleted(entry.id)
    } catch (err) {
      setError(errorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <article aria-label={audience(entry)} className="flex flex-col gap-6 rounded-showcase border border-border bg-surface-raised p-6 shadow-card sm:p-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-brand">
            {KIND_LABELS[entry.kind] ?? "Comment"}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${action.className}`}>{action.label}</span>
        </div>
        <h2 className="text-title-sm font-semibold text-balance text-foreground">{audience(entry)}</h2>
        <p className="text-caption text-muted-foreground">{dateTime(entry.createdAt)}</p>
      </header>

      {/* The exchange */}
      <div className="flex flex-col gap-3">
        {entry.postSnippet && (
          <blockquote className="rounded-card border border-border bg-background px-5 py-4">
            {entry.postAuthor && <p className="mb-1 text-caption font-semibold text-foreground">{entry.postAuthor}</p>}
            <p className="line-clamp-4 text-label text-muted-foreground">{entry.postSnippet}</p>
          </blockquote>
        )}
        <div className={cn("flex flex-col gap-1.5", entry.postSnippet && "pl-6 sm:pl-10")}>
          <p className="rounded-[1.25rem] rounded-tl-md bg-brand-soft px-5 py-4 text-body whitespace-pre-wrap text-foreground">
            {entry.comment}
          </p>
          <p className="pl-1 text-caption text-muted-foreground">Voice: {entry.profileName}</p>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-label font-medium text-foreground transition-colors duration-(--motion-fast) hover:bg-surface-muted">
            <ExternalLink className="size-4" aria-hidden />
            {LINK_LABELS[entry.kind] ?? "Open"}
          </a>
        )}
        {confirming ? (
          <span className="ml-auto flex items-center gap-1">
            <Button variant="destructive" size="sm" disabled={deleting} onClick={remove}>
              {deleting && <Loader2 className="animate-spin" aria-hidden />}
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            onClick={() => setConfirming(true)}
            className="ml-auto text-muted-foreground hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 aria-hidden />
          </Button>
        )}
      </footer>
      {error && <p role="alert" className="text-caption text-danger">{error}</p>}
    </article>
  )
}

export function HistoryList({ platform = "linkedin" }: { platform?: Platform } = {}) {
  const [kind, setKind] = useState<HistoryKind | null>(null)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Which entry the panel on the right shows (null: the newest).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (filter: HistoryKind | null, cursor: string | null) => {
    const params = new URLSearchParams({ limit: "30" })
    if (platform !== "linkedin") params.set("platform", platform)
    if (filter) params.set("kind", filter)
    if (cursor) params.set("cursor", cursor)
    return extApi<{ entries: HistoryEntry[]; nextCursor: string | null }>(`/api/ext/history?${params}`)
  }, [platform])

  // Loading/error are reset by the filter click (chooseFilter) rather than
  // here, so the effect only fetches.
  useEffect(() => {
    let cancelled = false
    load(kind, null)
      .then((res) => {
        if (cancelled) return
        setEntries(res.entries)
        setNextCursor(res.nextCursor)
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [kind, load])

  function chooseFilter(next: HistoryKind | null) {
    if (next === kind) return
    setLoading(true)
    setError(null)
    setKind(next)
  }

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const res = await load(kind, nextCursor)
      setEntries((list) => [...list, ...res.entries])
      setNextCursor(res.nextCursor)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  const selected = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null
  // Newest first, grouped by day.
  const days: { day: string; items: HistoryEntry[] }[] = []
  for (const entry of entries) {
    const day = dayOf(entry.createdAt)
    const last = days[days.length - 1]
    if (last && last.day === day) last.items.push(entry)
    else days.push({ day, items: [entry] })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label="Filter" className="no-scrollbar -mx-6 max-w-[calc(100%+3rem)] overflow-x-auto px-6 md:mx-0 md:max-w-full md:px-0">
          <div className="inline-flex gap-1 rounded-full border border-border bg-surface-muted p-1">
            {FILTERS[platform].map((f) => (
              <button
                key={f.label}
                type="button"
                aria-pressed={kind === f.kind}
                onClick={() => chooseFilter(f.kind)}
                className="h-8 shrink-0 rounded-full px-3.5 text-label font-medium whitespace-nowrap text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <span className="ml-auto text-caption text-muted-foreground">Kept for 90 days</span>
      </div>

      {error && (
        <p role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-label text-muted-foreground">Loading history…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-showcase border border-dashed border-border px-6 py-14 text-center text-label text-muted-foreground">
          {EMPTY[platform]}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="History" className="flex min-w-0 flex-col gap-5">
            {days.map(({ day, items }) => (
              <section key={day} aria-label={day} className="flex flex-col gap-1">
                <h3 className="px-3 text-caption font-medium text-muted-foreground">{day}</h3>
                <ul className="flex flex-col gap-0.5">
                  {items.map((entry) => {
                    const current = entry.id === selected?.id
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          aria-current={current ? "true" : undefined}
                          onClick={() => {
                            setSelectedId(entry.id)
                            requestAnimationFrame(() => {
                              if (!window.matchMedia("(min-width: 64rem)").matches)
                                detailRef.current?.scrollIntoView({ block: "start" })
                            })
                          }}
                          className="relative flex w-full flex-col gap-1 rounded-control px-3 py-2.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-muted aria-[current=true]:bg-surface-raised aria-[current=true]:shadow-card aria-[current=true]:before:absolute aria-[current=true]:before:inset-y-2.5 aria-[current=true]:before:left-0 aria-[current=true]:before:w-0.5 aria-[current=true]:before:rounded-full aria-[current=true]:before:bg-brand"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", ACTION_DOT[entry.action] ?? ACTION_DOT.NONE)} />
                            <span className="truncate text-label font-medium text-foreground">{audience(entry)}</span>
                            <span className="ml-auto shrink-0 text-caption text-muted-foreground tabular-nums">{timeOf(entry.createdAt)}</span>
                          </span>
                          <span className="truncate pl-3.5 text-caption text-muted-foreground">{entry.comment}</span>
                          <span className="sr-only">{(ACTION_LABELS[entry.action] ?? ACTION_LABELS.NONE).label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}

            {nextCursor && (
              <Button variant="outline" disabled={loadingMore} onClick={loadMore} className="self-start">
                {loadingMore && <Loader2 className="animate-spin" aria-hidden />}
                Load more
              </Button>
            )}
          </nav>

          <div ref={detailRef} className="min-w-0 scroll-mt-28 lg:sticky lg:top-6 lg:self-start">
            {selected && (
              <HistoryDetail
                key={selected.id}
                entry={selected}
                onDeleted={(id) => setEntries((list) => list.filter((e) => e.id !== id))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
