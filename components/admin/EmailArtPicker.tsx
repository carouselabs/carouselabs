"use client"

// The AI email writer's saved art (lib/emailArtLibrary.ts), to reuse a
// picture or sticker instead of painting a new one. Opened from the writer's
// "Picture & stickers" card; mounted only while open, so it loads fresh each
// time. Removing one takes it out of the library only: emails already sent
// still show it.
import { useEffect, useState } from "react"
import { AdminButton, AdminInput, Modal, fmtDate } from "@/components/admin/ui"

export type SavedArtItem = { id: string; kind: "picture" | "sticker"; url: string; description: string; createdAt: string }

export function EmailArtPicker({
  kind,
  onPick,
  onClose,
}: {
  kind: "picture" | "sticker"
  onPick: (art: SavedArtItem) => void
  onClose: () => void
}) {
  const [art, setArt] = useState<SavedArtItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/email-art?kind=${kind}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? "Couldn't load the saved art")
        if (!cancelled) setArt(body.art)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Couldn't load the saved art"))
    return () => {
      cancelled = true
    }
  }, [kind])

  async function remove(id: string) {
    setError(null)
    const res = await fetch(`/api/admin/email-art/${id}`, { method: "DELETE" })
    if (!res.ok && res.status !== 404) {
      setError("Couldn't remove it. Try again.")
      return
    }
    setConfirming(null)
    setArt((list) => list?.filter((a) => a.id !== id) ?? null)
  }

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = art?.filter((a) => words.every((w) => a.description.toLowerCase().includes(w))) ?? []
  const name = kind === "picture" ? "pictures" : "stickers"

  return (
    <Modal open onClose={onClose} title={`Saved ${name}`} wide>
      <div className="flex flex-col gap-4">
        <p className="text-caption text-muted-foreground">
          {kind === "picture"
            ? "Painted for earlier emails. Using one costs nothing; this email's headline is drawn on it fresh."
            : "Painted for earlier emails. Using one costs nothing."}
        </p>
        <AdminInput aria-label={`Search saved ${name}`} placeholder="Search, e.g. pencil" value={query} onChange={(e) => setQuery(e.target.value)} />
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
        {!art && !error ? (
          <p className="text-caption text-muted-foreground">Loading…</p>
        ) : art && art.length === 0 ? (
          <p className="rounded-control border border-dashed border-border p-6 text-center text-caption text-muted-foreground">
            No saved {name} yet. Every {kind} the writer paints is saved here.
          </p>
        ) : art && shown.length === 0 ? (
          <p className="text-caption text-muted-foreground">Nothing matches “{query}”.</p>
        ) : (
          <ul className={`grid max-h-[60vh] gap-3 overflow-y-auto pr-1 ${kind === "picture" ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {shown.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-control border border-border bg-surface p-2">
                <button
                  type="button"
                  onClick={() => onPick(a)}
                  aria-label={`Use: ${a.description}`}
                  className="flex flex-col gap-2 rounded-control-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <span
                    className={`flex items-center justify-center overflow-hidden rounded-control-sm bg-background ${kind === "picture" ? "aspect-[5/3]" : "aspect-square p-3"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- saved R2 art */}
                    <img src={a.url} alt="" loading="lazy" className={kind === "picture" ? "h-full w-full object-cover" : "max-h-full object-contain"} />
                  </span>
                  <span className="line-clamp-2 text-caption text-foreground">{a.description}</span>
                </button>
                <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
                  <span>{fmtDate(a.createdAt)}</span>
                  {confirming === a.id ? (
                    <span className="flex gap-1">
                      <AdminButton variant="danger" onClick={() => void remove(a.id)}>
                        Remove
                      </AdminButton>
                      <AdminButton variant="ghost" onClick={() => setConfirming(null)}>
                        Keep
                      </AdminButton>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirming(a.id)} className="font-medium hover:text-foreground">
                      Remove from library
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
