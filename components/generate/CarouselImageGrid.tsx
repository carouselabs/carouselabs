"use client"

import { useRef, useState } from "react"
import { Download, RefreshCw, Loader2, FileDown } from "lucide-react"
import { InstructionBox } from "@/components/generate/InstructionBox"
import { countWords } from "@/lib/wordCount"

export interface SlideImage {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  imageUrl: string
}

interface CarouselImageGridProps {
  images: SlideImage[]
  size: "4:5" | "1:1"
  ideaId: string
  onRegenerate: (slideNumber: number) => void
  regeneratingSlide: number | null
  complete?: boolean
  busy?: boolean
  // Per-slide custom instructions, keyed by slideNumber, and a change handler.
  instructions: Record<number, string>
  onInstructionChange: (slideNumber: number, value: string) => void
}

// Badges sit on top of the slide image, so they use solid light surfaces.
const ROLE_CONFIG = {
  hook: {
    label: "HOOK",
    className: "bg-warning-soft text-warning",
  },
  body: {
    label: "BODY",
    className: "bg-surface-raised text-foreground",
  },
  cta: {
    label: "CTA",
    className: "bg-success-soft text-success",
  },
}

// Fetch a cross-origin image as a base64 data URL (needed to embed in a PDF and
// to force a download). Routes through the same-origin proxy so R2's CORS policy
// can't block it. Throws if the proxy fetch fails.
async function fetchAsDataUrl(url: string): Promise<string> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error("fetch failed")
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a")
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function CarouselImageGrid({
  images,
  size,
  ideaId,
  onRegenerate,
  regeneratingSlide,
  complete = true,
  busy = false,
  instructions,
  onInstructionChange,
}: CarouselImageGridProps) {
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadingSlide, setDownloadingSlide] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfProgress, setPdfProgress] = useState(0)
  const downloadingRef = useRef(false)

  const sorted = [...images].sort((a, b) => a.slideNumber - b.slideNumber)

  // Per-slide download. Blob → object URL so it saves as a file; on CORS failure
  // fall back to opening the image in a new tab.
  async function downloadSlide(slide: SlideImage) {
    if (downloadingRef.current) return
    downloadingRef.current = true
    setDownloadingSlide(slide.slideNumber)
    setError(null)
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(slide.imageUrl)}`
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      triggerDownload(url, `carouselabs-slide-${slide.slideNumber}.png`)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError(`Slide ${slide.slideNumber} could not be downloaded. Check your connection and try again.`)
    } finally {
      downloadingRef.current = false
      setDownloadingSlide(null)
    }
  }

  // Combine every slide into a single multi-page PDF — one slide per page, each
  // page exactly the image size so the image fills the page edge-to-edge.
  async function downloadAllAsPdf() {
    if (downloadingRef.current || !complete || busy || sorted.length === 0) return
    downloadingRef.current = true
    setPdfProgress(0)
    setDownloadingAll(true)
    setError(null)

    // Image pixels (matches what gpt-image-2 produced). The page is exactly the
    // image size so the image fills the whole page with zero white space.
    const imgW = 1024
    const imgH = size === "4:5" ? 1280 : 1024
    const pageW = imgW
    const pageH = imgH

    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF({
        unit: "px",
        hotfixes: ["px_scaling"],
        format: [pageW, pageH],
        orientation: "portrait",
      })

      for (let i = 0; i < sorted.length; i++) {
        const slide = sorted[i]
        const dataUrl = await fetchAsDataUrl(slide.imageUrl) // throws on CORS
        if (i > 0) doc.addPage([pageW, pageH], "portrait")

        doc.addImage(dataUrl, dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG", 0, 0, imgW, imgH)
        setPdfProgress(i + 1)
      }

      doc.save(`carouselabs-carousel-${ideaId}.pdf`)
    } catch {
      setError(
        "Could not build the PDF. Your slides are unchanged. Check your connection and retry, or download slides individually.",
      )
    } finally {
      downloadingRef.current = false
      setDownloadingAll(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-label font-semibold text-foreground">Generated Slides</h2>
        <button
          type="button"
          onClick={downloadAllAsPdf}
          disabled={downloadingAll || downloadingSlide !== null || !complete || busy || images.length === 0}
          aria-busy={downloadingAll || undefined}
          className="inline-flex h-9 items-center gap-1.5 rounded-control-sm bg-primary px-3 text-label font-semibold text-primary-foreground transition-colors duration-(--motion-fast) hover:bg-primary-hover disabled:opacity-50"
        >
          {downloadingAll ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <FileDown className="size-4" aria-hidden />
          )}
          {downloadingAll ? `Building PDF ${pdfProgress}/${sorted.length}...` : "Download All as PDF"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-label text-danger">
          {error}
        </div>
      )}

      <ol aria-label="Slides" className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((slide) => {
          const roleConfig = ROLE_CONFIG[slide.role] ?? ROLE_CONFIG.body
          const isRegenerating = regeneratingSlide === slide.slideNumber
          const isDownloading = downloadingSlide === slide.slideNumber

          return (
            <li key={slide.slideNumber} className="flex min-w-0 flex-col gap-2.5">
              <div
                className={[
                  "relative w-full overflow-hidden rounded-card border border-border bg-surface shadow-card",
                  size === "4:5" ? "aspect-[4/5]" : "aspect-square",
                ].join(" ")}
              >
                {/* Slide number badge */}
                <span className="absolute top-2.5 left-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-surface-raised/90 text-caption font-semibold text-foreground tabular-nums shadow-card">
                  {slide.slideNumber}
                </span>

                {/* Role badge */}
                <span
                  className={[
                    "absolute top-2.5 right-2.5 z-10 rounded-detail px-2 py-0.5 text-[11px] leading-4 font-semibold tracking-wider shadow-card",
                    roleConfig.className,
                  ].join(" ")}
                >
                  {roleConfig.label}
                </span>

                {/* Regenerating overlay */}
                {isRegenerating && (
                  <div role="status" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-surface-raised/80 backdrop-blur-sm">
                    <Loader2 className="size-6 animate-spin text-foreground motion-reduce:animate-none" aria-hidden />
                    <span className="text-caption font-medium text-foreground">Regenerating…</span>
                  </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slide.slideNumber}: ${slide.headline}`}
                  loading="lazy"
                  decoding="async"
                  width={1024}
                  height={size === "4:5" ? 1280 : 1024}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Headline */}
              <p className="line-clamp-2 text-label text-foreground">
                {slide.headline}
              </p>
              {countWords(slide.headline) > 0 && (
                <p className="text-caption text-muted-foreground tabular-nums">
                  {countWords(slide.headline)} words
                </p>
              )}

              {/* Actions: regenerate + download (both functional) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRegenerate(slide.slideNumber)}
                  disabled={isRegenerating || regeneratingSlide !== null || busy || downloadingAll}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control-sm border border-control-border bg-surface px-2.5 text-caption font-medium text-foreground transition-colors duration-(--motion-fast) enabled:hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RefreshCw className="size-3.5" aria-hidden />
                  Regenerate Slide {slide.slideNumber} — 8 credits
                </button>
                <button
                  type="button"
                  onClick={() => downloadSlide(slide)}
                  disabled={downloadingSlide !== null || downloadingAll}
                  aria-label={`Download slide ${slide.slideNumber}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control-sm px-2.5 text-caption font-medium text-muted-foreground transition-colors duration-(--motion-fast) enabled:hover:bg-surface-muted enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isDownloading ? (
                    <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <Download className="size-3.5" aria-hidden />
                  )}
                  Download
                </button>
              </div>

              {/* Per-slide custom instruction for this slide's regeneration */}
              <InstructionBox
                value={instructions[slide.slideNumber] ?? ""}
                onChange={(v) => onInstructionChange(slide.slideNumber, v)}
                disabled={isRegenerating}
                rows={2}
              />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
