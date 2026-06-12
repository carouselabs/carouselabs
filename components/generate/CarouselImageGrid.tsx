"use client"

import { useState } from "react"
import { Download, RefreshCw, Loader2, FileDown } from "lucide-react"
import { jsPDF } from "jspdf"

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
}

const ROLE_CONFIG = {
  hook: {
    label: "HOOK",
    className: "bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] text-[#FCD34D]",
  },
  body: {
    label: "BODY",
    className: "bg-[rgba(99,102,241,0.12)] border border-[rgba(99,102,241,0.3)] text-[#A5B4FC]",
  },
  cta: {
    label: "CTA",
    className: "bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.3)] text-[#6EE7B7]",
  },
}

// Fetch a cross-origin image as a base64 data URL (needed to embed in a PDF and
// to force a download). Routes through the same-origin proxy so R2's CORS policy
// can't block it. Throws if the proxy fetch fails.
async function fetchAsDataUrl(url: string): Promise<string> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) throw new Error("fetch failed")
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
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
}: CarouselImageGridProps) {
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadingSlide, setDownloadingSlide] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sorted = [...images].sort((a, b) => a.slideNumber - b.slideNumber)

  // Per-slide download. Blob → object URL so it saves as a file; on CORS failure
  // fall back to opening the image in a new tab.
  async function downloadSlide(slide: SlideImage) {
    setDownloadingSlide(slide.slideNumber)
    setError(null)
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(slide.imageUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      triggerDownload(url, `carouselabs-slide-${slide.slideNumber}.png`)
      URL.revokeObjectURL(url)
    } catch {
      window.open(slide.imageUrl, "_blank") // fallback — open original in new tab
    } finally {
      setDownloadingSlide(null)
    }
  }

  // Combine every slide into a single multi-page PDF — one slide per page, each
  // page exactly the image size so the image fills the page edge-to-edge.
  async function downloadAllAsPdf() {
    setDownloadingAll(true)
    setError(null)

    // Image pixels (matches what gpt-image-2 produced). The page is exactly the
    // image size so the image fills the whole page with zero white space.
    const imgW = 1024
    const imgH = size === "4:5" ? 1280 : 1024
    const pageW = imgW
    const pageH = imgH

    try {
      const doc = new jsPDF({
        unit: "px",
        format: [pageW, pageH],
        orientation: "portrait",
      })

      for (let i = 0; i < sorted.length; i++) {
        const slide = sorted[i]
        const dataUrl = await fetchAsDataUrl(slide.imageUrl) // throws on CORS
        if (i > 0) doc.addPage([pageW, pageH], "portrait")

        doc.addImage(dataUrl, "PNG", 0, 0, imgW, imgH)
      }

      doc.save(`carouselabs-carousel-${ideaId}.pdf`)
    } catch {
      setError(
        "Couldn't build the PDF — the images may be blocked by CORS. Download slides individually instead.",
      )
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
          Generated Slides
        </p>
        <button
          onClick={downloadAllAsPdf}
          disabled={downloadingAll}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-colors disabled:opacity-50"
        >
          {downloadingAll ? (
            <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
          ) : (
            <FileDown size={13} strokeWidth={2.2} />
          )}
          {downloadingAll ? "Building PDF…" : "Download All as PDF"}
        </button>
      </div>

      {error && (
        <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[12px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((slide) => {
          const roleConfig = ROLE_CONFIG[slide.role] ?? ROLE_CONFIG.body
          const isRegenerating = regeneratingSlide === slide.slideNumber
          const isDownloading = downloadingSlide === slide.slideNumber

          return (
            <div key={slide.slideNumber} className="flex flex-col gap-2.5">
              <div
                className={[
                  "relative w-full rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)]",
                  size === "4:5" ? "aspect-[4/5]" : "aspect-square",
                ].join(" ")}
              >
                {/* Slide number badge */}
                <span className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full bg-[rgba(8,8,16,0.7)] backdrop-blur-sm flex items-center justify-center text-[11px] font-semibold text-[rgba(255,255,255,0.85)] tabular-nums">
                  {slide.slideNumber}
                </span>

                {/* Role badge */}
                <span
                  className={[
                    "absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider backdrop-blur-sm",
                    roleConfig.className,
                  ].join(" ")}
                >
                  {roleConfig.label}
                </span>

                {/* Regenerating overlay */}
                {isRegenerating && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[rgba(8,8,16,0.6)] backdrop-blur-sm">
                    <Loader2 size={22} className="animate-spin text-[#C4B5FD]" strokeWidth={2.2} />
                    <span className="text-[11px] text-[#C4B5FD]">Regenerating…</span>
                  </div>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slide.slideNumber}: ${slide.headline}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Headline */}
              <p className="text-[12px] text-[rgba(255,255,255,0.6)] leading-[1.45] line-clamp-2">
                {slide.headline}
              </p>

              {/* Actions: regenerate + download (both functional) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRegenerate(slide.slideNumber)}
                  disabled={isRegenerating || regeneratingSlide !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.16)] text-[11px] font-medium text-[#A78BFA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={11} strokeWidth={2.2} />
                  Regenerate Slide {slide.slideNumber}
                </button>
                <button
                  onClick={() => downloadSlide(slide)}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-[11px] font-medium text-[rgba(255,255,255,0.42)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <Loader2 size={11} className="animate-spin" strokeWidth={2.2} />
                  ) : (
                    <Download size={11} strokeWidth={2.2} />
                  )}
                  Download
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
