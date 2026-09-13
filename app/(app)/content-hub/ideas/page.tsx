"use client"

// Content Hub > Ideas Board — a lightweight scratchpad for raw material (a
// link, an image, or a quick note) saved for later, either typed in here or
// captured from any webpage via browser-extension-ideas/. "Turn into Post"
// hands an item off to the Custom Post composer (see
// app/(app)/content-hub/_client.tsx's boardItemId deep-link handling) — no
// AI generation, no credit charge, same as any other Custom Post.
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ImageIcon, LinkIcon, StickyNote, Trash2, Loader2, Plus, ExternalLink } from "lucide-react"

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

function IdeaCard({ item, onDelete, deleting }: { item: IdeaBoardItem; onDelete: () => void; deleting: boolean }) {
  const Icon = TYPE_ICON[item.type]
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-white">
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-[#7C3AED] bg-[rgba(124,58,237,0.1)]">
          <Icon size={11} strokeWidth={2.2} />
          {TYPE_LABEL[item.type]}
        </span>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Delete"
          className="p-1 rounded-lg text-[#9CA3AF] hover:text-[rgba(239,68,68,0.9)] hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} strokeWidth={2} />}
        </button>
      </div>

      {item.type === "image" ? (
        <div className="aspect-video rounded-lg overflow-hidden border border-[#E5E3DE] bg-[#F4F2EC]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.content} alt={item.title ?? ""} className="w-full h-full object-cover" />
        </div>
      ) : (
        <p className="text-[13px] text-[#374151] leading-[1.5] line-clamp-4 break-words">
          {item.title && (
            <>
              <span className="font-semibold text-[#0A0A0A]">{item.title}</span>
              <br />
            </>
          )}
          {item.content}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex flex-col min-w-0">
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-[#7C3AED] truncate transition-colors"
            >
              <ExternalLink size={10} />
              {safeHostname(item.sourceUrl)}
            </a>
          )}
          <span className="text-[11px] text-[#ADA99F]">Saved {timeAgo(item.createdAt)}</span>
        </div>
        <Link
          href={`/content-hub?boardItemId=${item.id}`}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors"
        >
          Turn into Post
        </Link>
      </div>
    </div>
  )
}

export default function IdeasBoardPage() {
  const [items, setItems] = useState<IdeaBoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      setItems((prev) => [(data as { item: IdeaBoardItem }).item, ...prev])
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

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/content-hub"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors w-fit"
        >
          <ArrowLeft size={13} strokeWidth={2.2} />
          Content Hub
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] font-bold text-[#0A0A0A]">Ideas Board</h1>
            <p className="text-[13px] text-[#9CA3AF]">
              Save links, images, and notes for later — capture them here or with the browser extension.
            </p>
          </div>
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_18px_rgba(124,58,237,0.25)] transition-colors"
          >
            <Plus size={14} strokeWidth={2.4} />
            Save an Idea
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-[#E5E3DE] bg-white">
          <div className="flex items-center gap-1.5">
            {(["note", "link", "image"] as ItemType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                className={[
                  "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                  formType === t
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#F4F2EC] text-[#9CA3AF] hover:text-[#4B5563]",
                ].join(" ")}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
          />
          {formType === "note" ? (
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your note…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors resize-y"
            />
          ) : (
            <input
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder={formType === "image" ? "https://example.com/image.jpg" : "https://example.com/article"}
              className="w-full px-3 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#1A1A1A] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
            />
          )}
          {formError && (
            <div className="px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
              {formError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : "Save"}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
            <StickyNote size={20} className="text-[#7C3AED]" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-[#6B7280]">Nothing saved yet</p>
            <p className="text-[13px] text-[#ADA99F] max-w-xs">
              Save a link, image, or note above, or right-click anything on the web with the CarouseLabs Ideas
              browser extension.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <IdeaCard
              key={item.id}
              item={item}
              onDelete={() => void handleDelete(item.id)}
              deleting={deletingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
