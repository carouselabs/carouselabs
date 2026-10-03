import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, History as HistoryIcon, Search, X } from "lucide-react";
import {
  apiFetch,
  ApiError,
  type HistoryEntry,
  type HistoryKind,
  type HistoryResponse,
} from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORM } from "@/lib/platform";
import { ScreenHeader } from "../ScreenHeader";

// History holds every kind of generation. Rows from before that carry no
// kind and are comments.
const KIND_LABELS: Record<HistoryKind, string> = {
  comment: "Comment",
  reply: "Reply",
  connection_note: "Connection note",
  message: "Message",
  x_reply: "Reply",
  x_message: "Message",
};

const LINK_LABELS: Record<HistoryKind, string> = {
  comment: "View post",
  reply: "View post",
  connection_note: "View profile",
  message: "Open chat",
  x_reply: "View post",
  x_message: "Open chat",
};

// The LinkedIn extension's History and the X extension's each show their own
// rows; the server keeps them apart (app/api/ext/history ?platform=x).
const HISTORY_SITE =
  PLATFORM === "x"
    ? {
        query: "?platform=x",
        origin: "https://x.com/",
        defaultKind: "x_reply" as HistoryKind,
        empty: "Replies and messages you write for X show up here, and on carouselabs.com under Extension.",
      }
    : {
        query: "",
        origin: "https://www.linkedin.com/",
        defaultKind: "comment" as HistoryKind,
        empty:
          "Comments, replies, connection notes and messages you generate show up here, and on carouselabs.com under Extension.",
      };

// The next page's URL, keeping the platform filter.
function historyUrl(cursor?: string): string {
  const params = new URLSearchParams(HISTORY_SITE.query);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return `/api/ext/history${query ? `?${query}` : ""}`;
}

// What the user did with it, in words ("NONE" says nothing).
const ACTION_LABELS: Record<string, string> = {
  COPIED: "Copied",
  INSERTED: "Inserted",
};

// Today's rows show the time, older ones the date: "14:05", "Yesterday", "28 Sep".
function formatWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      864e5,
  );
  if (days === 0) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch<HistoryResponse>(historyUrl())
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setNextCursor(res.nextCursor);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load history");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch<HistoryResponse>(historyUrl(nextCursor));
      setEntries((prev) => [...prev, ...res.entries]);
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load more");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleCopyAgain(entry: HistoryEntry) {
    try {
      await navigator.clipboard.writeText(entry.comment);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((id) => (id === entry.id ? null : id)), 2000);
    } catch {
      setError("Couldn't copy to clipboard");
    }
  }

  // Client-side filter: the page size is capped at 100 server-side, so this
  // never has a large list to scan. It searches the author and the comment
  // itself, which is how someone actually looks for a past comment.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.postAuthor.toLowerCase().includes(q) ||
        e.comment.toLowerCase().includes(q) ||
        e.postSnippet.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <ScreenHeader
        title="History"
        description="Everything you've written with Engage, newest first. Also on carouselabs.com."
      />

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <ul role="status" aria-label="Loading history" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="space-y-2.5 rounded-lg border bg-card p-3">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="w-full" />
              <Skeleton className="w-3/4" />
            </li>
          ))}
        </ul>
      ) : entries.length === 0 ? (
        !error && (
          <div className="flex animate-fade-in flex-col items-center gap-3 rounded-lg border border-dashed border-input px-4 py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <HistoryIcon aria-hidden className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Nothing yet</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{HISTORY_SITE.empty}</p>
            </div>
          </div>
        )
      ) : (
        <>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              aria-label="Search history"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or text"
              className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">Nothing matches "{query}".</p>
          )}

          <ul className="space-y-2">
            {filtered.map((entry) => {
              const kind = entry.kind ?? HISTORY_SITE.defaultKind;
              const action = ACTION_LABELS[entry.action];
              return (
                <li key={entry.id} className="animate-fade-in space-y-2 rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent">{KIND_LABELS[kind] ?? KIND_LABELS[HISTORY_SITE.defaultKind]}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {entry.postAuthor || "Unknown author"}
                    </span>
                    <time dateTime={entry.createdAt} className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatWhen(entry.createdAt)}
                    </time>
                  </div>

                  <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {entry.comment}
                  </p>

                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{entry.profileName}</span>
                    {action && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-0.5 text-success">
                          <Check aria-hidden className="h-3 w-3" />
                          {action}
                        </span>
                      </>
                    )}
                  </p>

                  <div className="-ml-2 flex flex-wrap gap-0.5">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleCopyAgain(entry)}>
                      {copiedId === entry.id ? (
                        <Check aria-hidden className="!size-3.5 animate-pop" />
                      ) : (
                        <Copy aria-hidden className="!size-3.5" />
                      )}
                      {copiedId === entry.id ? "Copied" : "Copy again"}
                    </Button>
                    {entry.postUrl.startsWith(HISTORY_SITE.origin) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => chrome.tabs.create({ url: entry.postUrl })}
                      >
                        <ExternalLink aria-hidden className="!size-3.5" />
                        {LINK_LABELS[kind] ?? "Open"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {nextCursor && !query && (
            <Button variant="outline" loading={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
