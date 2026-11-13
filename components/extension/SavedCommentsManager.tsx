"use client"

// components/extension/SavedCommentsManager.tsx — Engage → Saved comments on
// the website: the same list LinkedIn's side panel inserts from
// (app/api/ext/saved-comments), to write, edit, star, tag, delete, and bring
// in or out as a spreadsheet. The list arrives loaded with the page
// (app/(app)/extension/saved/page.tsx).
import { useMemo, useRef, useState } from "react"
import { Check, Copy, Download, Loader2, Pencil, Plus, Search, Star, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { controlClasses } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  REMIND_ON,
  SAVED_COMMENT_LIMITS,
  type RemindOn,
  type SavedCommentForClient,
} from "@/lib/engageSavedComments"
import { itemsFromCsv, savedCommentsToCsv } from "@/lib/savedCommentsCsv"
import { errorMessage, extApi, shortDate } from "./api"
import { EngagePageHead } from "./EngagePageHead"

const REMIND_LABEL: Record<RemindOn, string> = {
  own: "My own posts",
  any: "Every post",
  off: "Never",
}

const REMIND_NOTE: Record<RemindOn, string | null> = {
  own: "Offered the first time you open one of your own posts",
  any: "Offered the first time you open any post",
  off: null,
}

interface Draft {
  id: string | null
  title: string
  body: string
  tags: string
  remindOn: RemindOn
  favorite: boolean
}

const EMPTY_DRAFT: Draft = { id: null, title: "", body: "", tags: "", remindOn: "own", favorite: false }

function draftOf(c: SavedCommentForClient): Draft {
  return { id: c.id, title: c.title, body: c.body, tags: c.tags.join(", "), remindOn: c.remindOn, favorite: c.favorite }
}

function usedLine(c: SavedCommentForClient): string {
  if (!c.useCount || !c.lastUsedAt) return "Not used yet"
  return `Used ${c.useCount} ${c.useCount === 1 ? "time" : "times"}, last on ${shortDate(c.lastUsedAt)}`
}

// Favorites first, then the most recently used, then the newest: the order
// the server sends, kept after edits made here.
function sorted(list: SavedCommentForClient[]): SavedCommentForClient[] {
  return [...list].sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) ||
      (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "") ||
      b.createdAt.localeCompare(a.createdAt),
  )
}

export function SavedCommentsManager({ initial }: { initial: SavedCommentForClient[] }) {
  const [list, setList] = useState(() => sorted(initial))
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SavedCommentForClient | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const tags = useMemo(() => {
    const all = new Map<string, string>()
    for (const c of list) for (const t of c.tags) if (!all.has(t.toLowerCase())) all.set(t.toLowerCase(), t)
    return [...all.values()].sort((a, b) => a.localeCompare(b))
  }, [list])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter(
      (c) =>
        (!tag || c.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) &&
        (!q || c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))),
    )
  }, [list, query, tag])

  const replace = (row: SavedCommentForClient) => setList((current) => sorted(current.map((c) => (c.id === row.id ? row : c))))

  async function save() {
    if (!draft) return
    setSaving(true)
    setError(null)
    const payload = {
      title: draft.title,
      body: draft.body,
      tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      remindOn: draft.remindOn,
      favorite: draft.favorite,
    }
    try {
      if (draft.id) {
        const res = await extApi<{ savedComment: SavedCommentForClient }>(`/api/ext/saved-comments/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
        replace(res.savedComment)
        setNotice("Saved your changes.")
      } else {
        const res = await extApi<{ savedComment: SavedCommentForClient }>("/api/ext/saved-comments", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        setList((current) => sorted([res.savedComment, ...current]))
        setNotice("Saved. It's in the side panel on LinkedIn now.")
      }
      setDraft(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function toggleFavorite(c: SavedCommentForClient) {
    replace({ ...c, favorite: !c.favorite })
    try {
      const res = await extApi<{ savedComment: SavedCommentForClient }>(`/api/ext/saved-comments/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ favorite: !c.favorite }),
      })
      replace(res.savedComment)
    } catch (err) {
      replace(c)
      setNotice(errorMessage(err))
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await extApi(`/api/ext/saved-comments/${deleting.id}`, { method: "DELETE" })
      setList((current) => current.filter((c) => c.id !== deleting.id))
      if (draft?.id === deleting.id) setDraft(null)
      setNotice(`Deleted "${deleting.title}".`)
      setDeleting(null)
    } catch (err) {
      setNotice(errorMessage(err))
    } finally {
      setBusyDelete(false)
    }
  }

  async function copy(c: SavedCommentForClient) {
    try {
      await navigator.clipboard.writeText(c.body)
      setCopied(c.id)
      window.setTimeout(() => setCopied((id) => (id === c.id ? null : id)), 1500)
    } catch {
      setNotice("Couldn't copy here. Select the text and copy it instead.")
    }
  }

  async function importFile(file: File) {
    setImporting(true)
    setNotice(null)
    try {
      const parsed = itemsFromCsv(await file.text())
      if (!parsed.ok) {
        setNotice(parsed.error)
        return
      }
      const res = await extApi<{ created: number; skipped: { row: number; reason: string }[] }>(
        "/api/ext/saved-comments/import",
        { method: "POST", body: JSON.stringify({ items: parsed.items }) },
      )
      const fresh = await extApi<{ savedComments: SavedCommentForClient[] }>("/api/ext/saved-comments")
      setList(sorted(fresh.savedComments))
      const skipped = res.skipped.length
        ? ` Skipped ${res.skipped.length}: ${res.skipped
            .slice(0, 3)
            .map((s) => `row ${s.row + 1} (${s.reason.replace(/\.$/, "")})`)
            .join(", ")}${res.skipped.length > 3 ? ", and more" : ""}.`
        : ""
      setNotice(`Imported ${res.created} ${res.created === 1 ? "comment" : "comments"}.${skipped}`)
    } catch (err) {
      setNotice(errorMessage(err))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function exportFile() {
    const blob = new Blob([savedCommentsToCsv(list)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "saved-comments.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const bodyLength = draft?.body.trim().length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <EngagePageHead
        title="Saved comments,"
        accent="ready in one click."
        lead="The comments you post again and again, like the one you pin under every video. On LinkedIn, the side panel inserts them in one click and offers your usual one the first time you open a post."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Upload aria-hidden />}
              Import CSV
            </Button>
            <Button variant="outline" onClick={exportFile} disabled={list.length === 0}>
              <Download aria-hidden />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setError(null)
                setDraft({ ...EMPTY_DRAFT })
              }}
            >
              <Plus aria-hidden />
              New saved comment
            </Button>
          </div>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label="CSV file to import"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importFile(file)
        }}
      />

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-card bg-surface-raised px-4 py-3 text-label text-foreground shadow-card">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="rounded-control-sm p-1 text-muted-foreground hover:bg-surface-muted">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {draft && (
        <section aria-label={draft.id ? "Edit saved comment" : "New saved comment"} className="flex flex-col gap-5 rounded-showcase border border-border bg-surface-raised p-6 shadow-card sm:p-8">
          <h2 className="text-title-sm font-semibold text-foreground">{draft.id ? "Edit saved comment" : "New saved comment"}</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-foreground">Name</span>
              <input
                className={cn(controlClasses, "h-11 px-3")}
                value={draft.title}
                maxLength={SAVED_COMMENT_LIMITS.title}
                placeholder="Taken from the first line if left blank"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption font-semibold text-foreground">Tags</span>
              <input
                className={cn(controlClasses, "h-11 px-3")}
                value={draft.tags}
                placeholder="Separated by commas, e.g. pinned, newsletter"
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3 text-caption font-semibold text-foreground">
              Comment
              <span className={cn("font-normal tabular-nums", bodyLength > SAVED_COMMENT_LIMITS.body ? "text-danger" : "text-muted-foreground")}>
                {bodyLength.toLocaleString("en-US")} / 1,250
              </span>
            </span>
            <textarea
              className={cn(controlClasses, "min-h-36 px-3 py-2.5 leading-relaxed")}
              value={draft.body}
              placeholder="Exactly what you'd post. Line breaks, emoji and links stay as you write them."
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-caption font-semibold text-foreground">Remind me the first time I open</legend>
            <div className="flex flex-wrap gap-2">
              {REMIND_ON.map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-control-border px-3.5 text-label has-[:checked]:border-brand has-[:checked]:bg-surface-muted"
                >
                  <input
                    type="radio"
                    name="remindOn"
                    value={value}
                    checked={draft.remindOn === value}
                    onChange={() => setDraft({ ...draft, remindOn: value })}
                    className="size-4 accent-[var(--brand)]"
                  />
                  {REMIND_LABEL[value]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2.5 text-label text-foreground">
            <input
              type="checkbox"
              checked={draft.favorite}
              onChange={(e) => setDraft({ ...draft, favorite: e.target.checked })}
              className="size-4 accent-[var(--brand)]"
            />
            Favorite: keep it at the top
          </label>
          {error && (
            <div role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-caption text-danger">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
            <Button onClick={() => void save()} disabled={saving || bodyLength === 0 || bodyLength > SAVED_COMMENT_LIMITS.body}>
              {saving && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {draft.id ? "Save changes" : "Save comment"}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {list.length === 0 && !draft ? (
        <div className="flex flex-col items-start gap-4 rounded-showcase bg-surface-raised p-8 shadow-card">
          <h2 className="text-title-sm font-semibold text-foreground">Nothing saved yet</h2>
          <p className="max-w-xl text-body text-muted-foreground">
            Save the comment you post every time, like your pinned one under each video. In the side panel you can also
            save any comment Engage writes with one click.
          </p>
          <Button onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            <Plus aria-hidden />
            New saved comment
          </Button>
        </div>
      ) : (
        <>
          {list.length > 0 && (
            <div className="flex flex-col gap-3">
              <label className="relative flex max-w-md items-center">
                <span className="sr-only">Search saved comments</span>
                <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  className={cn(controlClasses, "h-11 pr-3 pl-9")}
                  placeholder="Search by name, text or tag"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {tags.length > 0 && (
                <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
                  {[null, ...tags].map((t) => (
                    <button
                      key={t ?? "all"}
                      type="button"
                      aria-pressed={tag === t}
                      onClick={() => setTag(t)}
                      className="min-h-9 rounded-full border border-control-border px-3.5 text-label text-foreground hover:bg-surface-muted aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {t ?? `All (${list.length})`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {shown.length === 0 && list.length > 0 ? (
            <p className="text-body text-muted-foreground">No saved comment matches that.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {shown.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 rounded-card bg-surface-raised p-5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-body font-semibold break-words text-foreground">{c.title}</h3>
                    <button
                      type="button"
                      aria-pressed={c.favorite}
                      aria-label={c.favorite ? `Remove from favorites: ${c.title}` : `Add to favorites: ${c.title}`}
                      onClick={() => void toggleFavorite(c)}
                      className="-mt-1.5 -mr-1.5 grid size-9 shrink-0 place-items-center rounded-control-sm text-muted-foreground hover:bg-surface-muted aria-pressed:text-[#B7791F]"
                    >
                      <Star className={cn("size-[18px]", c.favorite && "fill-current")} aria-hidden />
                    </button>
                  </div>
                  <p className="line-clamp-6 text-label leading-relaxed whitespace-pre-wrap text-foreground/90">{c.body}</p>
                  {(c.tags.length > 0 || REMIND_NOTE[c.remindOn]) && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.tags.map((t) => (
                        <span key={t} className="rounded-full bg-surface-muted px-2.5 py-1 text-caption text-foreground">
                          {t}
                        </span>
                      ))}
                      {REMIND_NOTE[c.remindOn] && <span className="text-caption text-muted-foreground">{REMIND_NOTE[c.remindOn]}</span>}
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span className="mr-auto text-caption text-muted-foreground">{usedLine(c)}</span>
                    <Button variant="ghost" size="sm" onClick={() => void copy(c)} aria-label={`Copy: ${c.title}`}>
                      {copied === c.id ? <Check aria-hidden /> : <Copy aria-hidden />}
                      {copied === c.id ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit: ${c.title}`}
                      onClick={() => {
                        setError(null)
                        setDraft(draftOf(c))
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                    >
                      <Pencil aria-hidden />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete: ${c.title}`} onClick={() => setDeleting(c)}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete this saved comment?"
        description={deleting ? `"${deleting.title}" goes from the side panel too. This can't be undone.` : undefined}
        confirmLabel="Delete"
        tone="danger"
        pending={busyDelete}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
