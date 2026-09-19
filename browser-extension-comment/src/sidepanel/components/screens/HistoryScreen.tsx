import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  ApiError,
  type HistoryEntry,
  type HistoryResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

const fieldClass =
  "w-full rounded-md border border-input bg-background p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

    apiFetch<HistoryResponse>("/api/ext/history")
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
      const res = await apiFetch<HistoryResponse>(`/api/ext/history?cursor=${nextCursor}`);
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

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading history…</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">History</h2>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-input p-3 text-xs text-muted-foreground">
          No comments yet. Click Comment on a LinkedIn post and generate one, and it'll show up
          here.
        </p>
      ) : (
        <>
          <input
            className={fieldClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by author or comment text"
          />

          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nothing matches "{query}".
            </p>
          )}

          {filtered.map((entry) => (
            <div key={entry.id} className="space-y-1.5 rounded-md border border-input p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {entry.postAuthor || "Unknown author"}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDate(entry.createdAt)}
                </span>
              </div>

              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-foreground/90">
                {entry.comment}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5">{entry.profileName}</span>
                {entry.action !== "NONE" && (
                  <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{entry.action}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => handleCopyAgain(entry)}>
                  {copiedId === entry.id ? "Copied" : "Copy again"}
                </Button>
                {entry.postUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => chrome.tabs.create({ url: entry.postUrl })}
                  >
                    View post
                  </Button>
                )}
              </div>
            </div>
          ))}

          {nextCursor && !query && (
            <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
