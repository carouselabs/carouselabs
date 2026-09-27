"use client"

// Extension → History: every generation the extension made — comments,
// replies, connection notes, messages — from the same route the side panel's
// History screen reads (app/api/ext/history).
import { useCallback, useEffect, useState } from "react"
import { Check, Copy, ExternalLink, Loader2, Trash2 } from "lucide-react"
import { dateTime, errorMessage, extApi, type HistoryEntry, type HistoryKind } from "./api"

const FILTERS: { kind: HistoryKind | null; label: string }[] = [
  { kind: null, label: "All" },
  { kind: "comment", label: "Comments" },
  { kind: "reply", label: "Replies" },
  { kind: "connection_note", label: "Connection notes" },
  { kind: "message", label: "Messages" },
]

const KIND_LABELS: Record<HistoryKind, string> = {
  comment: "Comment",
  reply: "Reply",
  connection_note: "Connection note",
  message: "Message",
}

// Who the text was for, in each kind's own words.
function audience(entry: HistoryEntry): string {
  const name = entry.postAuthor || "someone"
  switch (entry.kind) {
    case "reply":
      return `Reply on ${name}'s post`
    case "connection_note":
      return `Note to ${name}`
    case "message":
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
}

// Only real LinkedIn pages are linked; anything else in postUrl is ignored.
function linkedInHref(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === "https:" && parsed.hostname === "www.linkedin.com" ? parsed.toString() : null
  } catch {
    return null
  }
}

const ACTION_LABELS: Record<HistoryEntry["action"], { label: string; className: string }> = {
  INSERTED: { label: "Inserted", className: "text-[#15803D] bg-[#DCFCE7]" },
  COPIED: { label: "Copied", className: "text-[#1D4ED8] bg-[#DBEAFE]" },
  NONE: { label: "Not used", className: "text-[#6B7280] bg-[#F3F4F6]" },
}

function HistoryRow({ entry, onDeleted }: { entry: HistoryEntry; onDeleted: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const href = linkedInHref(entry.postUrl)
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
    <article className="flex flex-col gap-3 rounded-2xl border border-[#E5E3DE] bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[rgba(124,58,237,0.08)] px-2.5 py-0.5 text-[11px] font-semibold text-[#7C3AED]">
          {KIND_LABELS[entry.kind] ?? "Comment"}
        </span>
        <span className="text-[12.5px] font-medium text-[#0A0A0A]">{audience(entry)}</span>
        <span className="text-[12px] text-[#9CA3AF]">· {dateTime(entry.createdAt)}</span>
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${action.className}`}>
          {action.label}
        </span>
      </div>

      {entry.postSnippet && (
        <p className="line-clamp-2 border-l-2 border-[#E5E3DE] pl-3 text-[12.5px] leading-[1.55] text-[#6B7280]">
          {entry.postSnippet}
        </p>
      )}

      <p className="whitespace-pre-wrap text-[13.5px] leading-[1.65] text-[#0A0A0A]">{entry.comment}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] text-[#9CA3AF]">Voice: {entry.profileName}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#F9F7F2]"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E3DE] px-3 py-1.5 text-[12px] font-semibold text-[#374151] hover:bg-[#F9F7F2]"
            >
              <ExternalLink size={13} />
              {LINK_LABELS[entry.kind] ?? "Open"}
            </a>
          )}
          {confirming ? (
            <>
              <button
                type="button"
                disabled={deleting}
                onClick={remove}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#DC2626] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {deleting && <Loader2 size={12} className="animate-spin" />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-2 py-1.5 text-[12px] font-medium text-[#6B7280] hover:text-[#0A0A0A]"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Delete"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center rounded-lg border border-[#E5E3DE] p-1.5 text-[#9CA3AF] hover:border-[#DC2626]/40 hover:text-[#DC2626]"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}
    </article>
  )
}

export function HistoryList() {
  const [kind, setKind] = useState<HistoryKind | null>(null)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (filter: HistoryKind | null, cursor: string | null) => {
    const params = new URLSearchParams({ limit: "30" })
    if (filter) params.set("kind", filter)
    if (cursor) params.set("cursor", cursor)
    return extApi<{ entries: HistoryEntry[]; nextCursor: string | null }>(`/api/ext/history?${params}`)
  }, [])

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => chooseFilter(f.kind)}
            className={[
              "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              kind === f.kind
                ? "bg-[#1A1A1A] text-white"
                : "border border-[#E5E3DE] bg-white text-[#6B7280] hover:text-[#0A0A0A]",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[11.5px] text-[#9CA3AF]">Kept for 90 days</span>
      </div>

      {error && <p className="text-[13px] text-[#DC2626]">{error}</p>}

      {loading ? (
        <p className="text-[13px] text-[#9CA3AF]">Loading history…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E3DE] p-8 text-center text-[13px] text-[#6B7280]">
          Nothing here yet. Everything the extension writes for you on LinkedIn shows up here.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              onDeleted={(id) => setEntries((list) => list.filter((e) => e.id !== id))}
            />
          ))}
        </div>
      )}

      {nextCursor && !loading && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={loadMore}
          className="mx-auto inline-flex items-center gap-2 rounded-xl border border-[#E5E3DE] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#F9F7F2] disabled:opacity-60"
        >
          {loadingMore && <Loader2 size={14} className="animate-spin" />}
          Load more
        </button>
      )}
    </div>
  )
}
