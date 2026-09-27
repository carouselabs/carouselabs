"use client"

// /admin/posts — everything users make, as a gallery for quality checks:
// website posts (carousels, images, thumbnails, captions, custom posts) and
// the LinkedIn extension's comments, replies, notes and messages, newest
// first (/api/admin/posts). Click a card to see every image full-size and the
// full text. View only.
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Download, ExternalLink, Images, MessageSquare, Type, X } from "lucide-react"
import { AdminButton, AdminInput, AdminSelect, Spinner, fmtDateTime } from "@/components/admin/ui"
import { exportToCSV } from "@/lib/adminExport"
import { useToast } from "@/components/admin/Toast"
import {
  EXTENSION_FILTER,
  EXTENSION_KIND_LABELS,
  EXTENSION_KIND_PREFIX,
  POST_FORMAT_LABELS,
  type AdminCreation,
  type AdminCreationsCursor,
  type AdminCreationsResponse,
} from "@/lib/adminCreations"

type Filters = { search: string; type: string; from: string; to: string }

async function fetchPage(filters: Filters, cursor: AdminCreationsCursor | null): Promise<AdminCreationsResponse> {
  const params = new URLSearchParams()
  if (filters.search.trim()) params.set("search", filters.search.trim())
  if (filters.type) params.set("type", filters.type)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (cursor) {
    for (const [key, value] of Object.entries(cursor)) if (value) params.set(key, value)
  }
  const res = await fetch(`/api/admin/posts?${params}`)
  if (!res.ok) throw new Error()
  return res.json()
}

function TypeBadge({ creation }: { creation: AdminCreation }) {
  const fromExtension = creation.source === "extension"
  const Icon = fromExtension ? MessageSquare : creation.images.length > 0 ? Images : Type
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
        fromExtension ? "bg-[#0E2A3D] text-[#7CC4F5]" : "bg-[#2A1F45] text-[#C4B5FD]"
      }`}
    >
      <Icon className="h-3 w-3" />
      {fromExtension ? `Extension · ${creation.typeLabel}` : creation.typeLabel}
    </span>
  )
}

// A creation with no images: its text (and, for the extension, what it
// answered) stands in for the picture.
function TextPreview({ creation }: { creation: AdminCreation }) {
  const noImagesYet = creation.source === "post" && creation.type !== "TEXT_ONLY"
  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4">
      {noImagesYet && <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6A6A6A]">No images</p>}
      {creation.context && (
        <p className="line-clamp-3 border-l-2 border-[#333] pl-2 text-[11.5px] italic text-[#6A6A6A]">
          {creation.context}
        </p>
      )}
      <p className="line-clamp-[9] whitespace-pre-line text-[12.5px] leading-relaxed text-[#D0D0D0]">
        {creation.text || "No text saved"}
      </p>
    </div>
  )
}

function CreationCard({ creation, onOpen }: { creation: AdminCreation; onOpen: () => void }) {
  const cover = creation.images[0]
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${creation.title}`}
        className="group relative block h-64 w-full overflow-hidden bg-[#111] text-left"
      >
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt={creation.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
            {creation.images.length > 1 && (
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                <Images className="h-3 w-3" />
                {creation.images.length}
              </span>
            )}
          </>
        ) : (
          <TextPreview creation={creation} />
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 border-t border-[#2A2A2A] p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge creation={creation} />
          {creation.status && (
            <span className="text-[10.5px] uppercase tracking-wide text-[#6A6A6A]">{creation.status}</span>
          )}
        </div>
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">{creation.title}</p>
        {cover && creation.text && <p className="line-clamp-2 text-[12px] text-[#8A8A8A]">{creation.text}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[11.5px]">
          <Link href={`/admin/users/${creation.userId}`} className="truncate text-[#A78BFA] hover:underline">
            {creation.email}
          </Link>
          <span className="shrink-0 text-[#6A6A6A]">{fmtDateTime(creation.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// Full-size view: every image (arrow keys or the buttons to move between
// carousel slides) beside the full text and details. Esc closes.
function CreationViewer({ creation, onClose }: { creation: AdminCreation; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const count = creation.images.length
  const image = creation.images[index]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight" && count > 1) setIndex((i) => (i + 1) % count)
      else if (e.key === "ArrowLeft" && count > 1) setIndex((i) => (i - 1 + count) % count)
    }
    window.addEventListener("keydown", onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
  }, [count, onClose])

  const details = (
    <div className="flex flex-col gap-4 overflow-y-auto p-5 lg:w-[380px] lg:shrink-0 lg:border-l lg:border-[#2A2A2A]">
      <div className="flex flex-col gap-2 pr-8">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge creation={creation} />
          {creation.status && (
            <span className="text-[10.5px] uppercase tracking-wide text-[#6A6A6A]">{creation.status}</span>
          )}
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-white">{creation.title}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <Link href={`/admin/users/${creation.userId}`} className="text-[#A78BFA] hover:underline">
            {creation.email}
          </Link>
          <span className="text-[#6A6A6A]">{fmtDateTime(creation.createdAt)}</span>
          {creation.credits !== null && <span className="text-[#6A6A6A]">{creation.credits} credits</span>}
        </div>
        {creation.profileName && <p className="text-[12px] text-[#8A8A8A]">Tone: {creation.profileName}</p>}
      </div>

      {creation.context && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6A6A6A]">Written for</p>
          <p className="whitespace-pre-line border-l-2 border-[#333] pl-3 text-[12.5px] italic leading-relaxed text-[#8A8A8A]">
            {creation.context}
          </p>
        </div>
      )}

      {creation.text && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6A6A6A]">
            {creation.source === "extension" ? "Generated text" : creation.type === "THUMBNAIL" ? "Brief" : "Caption"}
          </p>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#D0D0D0]">{creation.text}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {creation.linkUrl && (
          <a
            href={creation.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#232323] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2E2E2E]"
          >
            Open on LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {image && (
          <a
            href={image}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] bg-[#232323] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2E2E2E]"
          >
            Open full image <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[90] flex bg-black/85 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={creation.title}
        onClick={(e) => e.stopPropagation()}
        className={`relative m-auto flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#141414] lg:flex-row ${
          count > 0 ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-lg bg-black/60 p-1.5 text-[#B0B0B0] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {count > 0 && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0B0B0B]">
            <div className="relative flex min-h-[240px] flex-1 items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`${creation.title} — ${index + 1}`} className="max-h-[70vh] max-w-full object-contain" />
              {count > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => setIndex((i) => (i - 1 + count) % count)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => setIndex((i) => (i + 1) % count)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                    {index + 1} / {count}
                  </span>
                </>
              )}
            </div>
            {count > 1 && (
              <div className="flex gap-2 overflow-x-auto border-t border-[#2A2A2A] p-3">
                {creation.images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    aria-label={`Image ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={`h-16 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-[#111] ${
                      i === index ? "border-[#7C3AED]" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {details}
      </div>
    </div>
  )
}

export function PostsGallery() {
  const { toast } = useToast()
  const initialSearch = useSearchParams().get("search") ?? ""

  const [filters, setFilters] = useState<Filters>({ search: initialSearch, type: "", from: "", to: "" })
  const [items, setItems] = useState<AdminCreation[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [next, setNext] = useState<AdminCreationsCursor | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [viewing, setViewing] = useState<AdminCreation | null>(null)
  // Only the newest request may update the list, so a slow response for an
  // older filter can't overwrite a newer one.
  const requestId = useRef(0)

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }))

  // Any filter change reloads from the top; the text search is debounced.
  useEffect(() => {
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const page = await fetchPage(filters, null)
        if (id !== requestId.current) return
        setItems(page.items)
        setTotal(page.total)
        setNext(page.next)
      } catch {
        if (id === requestId.current) toast("Failed to load posts", "error")
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }, filters.search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [filters, toast])

  const loadMore = async () => {
    if (!next) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      const page = await fetchPage(filters, next)
      if (id !== requestId.current) return
      setItems((list) => [...list, ...page.items])
      setNext(page.next)
    } catch {
      toast("Failed to load more", "error")
    } finally {
      setLoadingMore(false)
    }
  }

  // Exports everything matching the current filters, not just what's shown.
  const exportAll = async () => {
    setExporting(true)
    try {
      const all: AdminCreation[] = []
      let cursor: AdminCreationsCursor | null = null
      do {
        const page: AdminCreationsResponse = await fetchPage(filters, cursor)
        all.push(...page.items)
        cursor = page.next
      } while (cursor)
      exportToCSV(
        all.map((c) => ({
          UserEmail: c.email,
          Source: c.source === "post" ? "Website" : "Extension",
          Type: c.typeLabel,
          Status: c.status ?? "",
          Title: c.title,
          Text: c.text ?? "",
          Images: c.images.join(" "),
          CreatedAt: c.createdAt,
          CreditsCost: c.credits ?? "",
        })),
        "carouselabs-posts",
      )
    } catch {
      toast("Export failed", "error")
    } finally {
      setExporting(false)
    }
  }

  const dateInputCls =
    "h-9 rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 text-[13px] text-white outline-none focus:border-[#7C3AED] [color-scheme:dark]"

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <AdminInput
          placeholder="Search by email, title or text…"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="w-80"
        />
        <AdminSelect value={filters.type} onChange={(e) => setFilter({ type: e.target.value })}>
          <option value="">Everything</option>
          <optgroup label="Website">
            {Object.entries(POST_FORMAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Extension">
            <option value={EXTENSION_FILTER}>All extension</option>
            {Object.entries(EXTENSION_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={`${EXTENSION_KIND_PREFIX}${value}`}>
                {label}
              </option>
            ))}
          </optgroup>
        </AdminSelect>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilter({ from: e.target.value })}
          className={dateInputCls}
        />
        <span className="text-[12px] text-[#6A6A6A]">to</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilter({ to: e.target.value })}
          className={dateInputCls}
        />
        {total !== null && (
          <span className="text-[12px] text-[#6A6A6A]">
            Showing {items.length} of {total}
          </span>
        )}
        <div className="ml-auto">
          <AdminButton variant="secondary" onClick={exportAll} loading={exporting}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </AdminButton>
        </div>
      </div>

      {/* Gallery */}
      {loading && items.length === 0 ? (
        <Spinner label="Loading posts…" />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2A2A2A] py-16 text-center text-[13px] text-[#6A6A6A]">
          Nothing matches these filters
        </div>
      ) : (
        <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
          {items.map((c) => (
            <CreationCard key={`${c.source}:${c.id}`} creation={c} onOpen={() => setViewing(c)} />
          ))}
        </div>
      )}

      {next && !loading && (
        <div className="flex justify-center pt-2">
          <AdminButton variant="secondary" onClick={loadMore} loading={loadingMore}>
            Load more
          </AdminButton>
        </div>
      )}

      {viewing && (
        <CreationViewer
          key={`${viewing.source}:${viewing.id}`}
          creation={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
