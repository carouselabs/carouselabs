"use client"

// Content Hub > Ideas Board — a lightweight scratchpad for raw material (a
// link, an image, or a quick note) saved for later, typed in here. "Turn into Post"
// hands an item off to the Custom Post composer (see
// app/(app)/content-hub/_client.tsx's boardItemId deep-link handling) — no
// AI generation, no credit charge, same as any other Custom Post.
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ImageIcon, LinkIcon, StickyNote, Trash2, Loader2, Plus, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/patterns/PageHeader"
import { EmptyState } from "@/components/patterns/EmptyState"
import { BackLink } from "@/components/create/CreateKit"

type ItemType = "link" | "image" | "note"

interface IdeaBoardItem {
  id: string
  type: ItemType
  content: string
  sourceUrl: string | null
  title: string | null
  createdAt: string
}

const TYPE_ICON: Record<ItemType, typeof LinkIcon> = {
  link: LinkIcon,
  image: ImageIcon,
  note: StickyNote,
}

const TYPE_LABEL: Record<ItemType, string> = {
  link: "Link",
  image: "Image",
  note: "Note",
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso))
}

function ItemThumb({ item }: { item: IdeaBoardItem }) {
  const Icon = TYPE_ICON[item.type]
  if (item.type === "image") {
    return (
      <span className="size-11 shrink-0 overflow-hidden rounded-control-sm border border-border bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.content} alt="" className="h-full w-full object-cover" />
      </span>
    )
  }
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-control-sm",
        item.type === "note" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand"
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  )
}

/** One saved idea in the list: what it is, where it came from, when. */
function IdeaRow({ item, selected, onSelect }: { item: IdeaBoardItem; selected: boolean; onSelect: () => void }) {
  const headline = item.title || (item.type === "note" ? item.content : safeHostname(item.content))
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-card p-2.5 text-left transition-colors duration-(--motion-fast) hover:bg-surface-raised",
        selected && "bg-surface-raised shadow-card"
      )}
    >
      <ItemThumb item={item} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-1 text-label font-medium text-foreground">{headline}</span>
        <span className="truncate text-caption text-muted-foreground">
          {TYPE_LABEL[item.type]} · Saved {timeAgo(item.createdAt)}
        </span>
      </span>
    </button>
  )
}

/** The chosen idea in full, with the way into the composer. */
function IdeaDetail({ item, onDelete, deleting }: { item: IdeaBoardItem; onDelete: () => void; deleting: boolean }) {
  const Icon = TYPE_ICON[item.type]
  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">
          <Icon className="size-3" aria-hidden />
          {TYPE_LABEL[item.type]}
        </span>
        <span>Saved {timeAgo(item.createdAt)}</span>
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 truncate rounded-detail transition-colors duration-(--motion-fast) hover:text-brand"
          >
            <ExternalLink className="size-3 shrink-0" aria-hidden />
            {safeHostname(item.sourceUrl)}
          </a>
        )}
      </div>

      {item.type === "image" ? (
        <div className="flex flex-col gap-4">
          {item.title && <h2 className="text-title-sm font-semibold text-foreground">{item.title}</h2>}
          <div className="overflow-hidden rounded-card border border-border bg-surface-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.content} alt={item.title ?? ""} className="max-h-[28rem] w-full object-contain" />
          </div>
        </div>
      ) : item.type === "note" ? (
        <div className="flex flex-col gap-3">
          {item.title && <h2 className="text-body-lg font-semibold text-foreground">{item.title}</h2>}
          <p className="font-display text-[1.5rem] leading-[1.4] break-words whitespace-pre-wrap text-foreground sm:text-[1.75rem]">
            {item.content}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {item.title && <h2 className="text-title-sm font-semibold text-balance text-foreground">{item.title}</h2>}
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1.5 rounded-detail text-label break-all text-brand underline-offset-4 hover:underline"
          >
            {item.content}
            <ExternalLink className="mt-1 size-3.5 shrink-0" aria-hidden />
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <Link href={`/content-hub?boardItemId=${item.id}`} className={buttonVariants({ variant: "brand" })}>
          Turn into Post
        </Link>
        <Button
          variant="ghost"
          onClick={onDelete}
          disabled={deleting}
          title="Delete"
          aria-label="Delete"
          className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
        >
          {deleting ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
        </Button>
      </div>
    </article>
  )
}

export default function IdeasBoardPage() {
  const [items, setItems] = useState<IdeaBoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Which idea the detail column shows; falls back to the newest.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formType, setFormType] = useState<ItemType>("note")
  const [formContent, setFormContent] = useState("")
  const [formTitle, setFormTitle] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/ideas-board")
        const data = await res.json()
        if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load")
        if (active) setItems((data as { items: IdeaBoardItem[] }).items)
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

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id)
    const snapshot = items
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      const res = await fetch(`/api/ideas-board/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    } catch {
      setItems(snapshot)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit() {
    if (!formContent.trim()) {
      setFormError(formType === "image" ? "Add an image URL" : formType === "link" ? "Add a URL" : "Add a note")
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch("/api/ideas-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formType,
          content: formContent.trim(),
          title: formTitle.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to save")
      const saved = (data as { item: IdeaBoardItem }).item
      setItems((prev) => [saved, ...prev])
      setSelectedId(saved.id)
      setFormOpen(false)
      setFormContent("")
      setFormTitle("")
      setFormType("note")
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null

  function select(id: string) {
    setSelectedId(id)
    // Below the two-column layout the detail sits under the list — bring it into view.
    if (!window.matchMedia("(min-width: 64rem)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackLink href="/content-hub">Content Hub</BackLink>
        <PageHeader
          title="Ideas Board"
          description="Save links, images, and notes for later — capture them here or with the browser extension."
          actions={
            <Button variant={formOpen ? "outline" : "default"} aria-expanded={formOpen} onClick={() => setFormOpen((v) => !v)}>
              <Plus aria-hidden />
              Save an Idea
            </Button>
          }
        />
      </div>

      {formOpen && (
        <div className="flex flex-col gap-3 rounded-showcase border border-border bg-surface-raised p-4 shadow-card sm:p-5">
          <div role="group" aria-label="Kind of idea" className="inline-flex self-start rounded-control border border-border bg-surface p-1">
            {(["note", "link", "image"] as ItemType[]).map((t) => {
              const Icon = TYPE_ICON[t]
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={formType === t}
                  onClick={() => setFormType(t)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control-sm px-3 text-label font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"
                >
                  <Icon className="size-3.5" aria-hidden />
                  {TYPE_LABEL[t]}
                </button>
              )
            })}
          </div>
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Title (optional)"
            className={cn(controlClasses, "h-11 px-3")}
          />
          {formType === "note" ? (
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your note…"
              aria-label="Write your note…"
              rows={4}
              className={cn(controlClasses, "resize-y px-3 py-2.5 leading-relaxed")}
            />
          ) : (
            <input
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder={formType === "image" ? "https://example.com/image.jpg" : "https://example.com/article"}
              aria-label={formType === "image" ? "https://example.com/image.jpg" : "https://example.com/article"}
              className={cn(controlClasses, "h-11 px-3")}
            />
          )}
          {formError && (
            <p role="alert" className="rounded-control-sm border border-danger/25 bg-danger-soft px-3 py-2 text-caption text-danger">
              {formError}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button variant="brand" onClick={() => void handleSubmit()} disabled={submitting} className="min-w-28">
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div aria-hidden className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5">
                <Skeleton className="size-11" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden flex-col gap-4 lg:flex">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<StickyNote />}
          title="Nothing saved yet"
          description="Save a link, image, or note above, or right-click anything on the web with the CarouseLabs Ideas browser extension."
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Ideas" className="lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto lg:pr-1">
            <ul className="flex flex-col gap-1">
              {items.map((item) => (
                <li key={item.id}>
                  <IdeaRow item={item} selected={selected?.id === item.id} onSelect={() => select(item.id)} />
                </li>
              ))}
            </ul>
          </nav>
          <div ref={detailRef} className="min-w-0 scroll-mt-6">
            {selected && (
              <div className="rounded-showcase border border-border bg-surface p-5 shadow-card sm:p-8 lg:sticky lg:top-0">
                <IdeaDetail
                  key={selected.id}
                  item={selected}
                  onDelete={() => void handleDelete(selected.id)}
                  deleting={deletingId === selected.id}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
