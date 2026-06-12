"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Copy, Check, History, Loader2 } from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { CarouselSlideList } from "@/components/generate/CarouselSlideList"
import { CarouselImageGrid, type SlideImage } from "@/components/generate/CarouselImageGrid"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { VersionHistory } from "@/components/generate/VersionHistory"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"

interface CarouselClientProps {
  ideaId: string
  ideaHook: string
}

type Step = 1 | 2 | 3 | 4
type ImageSize = "4:5" | "1:1"

interface Slide {
  slideNumber: number
  role: "hook" | "body" | "cta"
  headline: string
  prompt: string
}

const SKELETON_WIDTHS = ["88%", "72%", "95%", "65%", "80%", "55%", "70%", "40%"]

export function CarouselClient({ ideaId, ideaHook }: CarouselClientProps) {
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [caption, setCaption] = useState("")
  const [isStreamingCaption, setIsStreamingCaption] = useState(false)
  const [captionReady, setCaptionReady] = useState(false)

  // Step 2
  const [size, setSize] = useState<ImageSize | null>(null)

  // Step 3
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceMediaType, setReferenceMediaType] = useState("image/jpeg")

  // Step 4
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)

  // Step 4b — actual slide images generated from the prompts
  const [slideImages, setSlideImages] = useState<SlideImage[]>([])
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [restored, setRestored] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [captionInstruction, setCaptionInstruction] = useState("")
  const [slidesInstruction, setSlidesInstruction] = useState("")

  const abortRef = useRef<AbortController | null>(null)
  const didInit = useRef(false)

  // Regeneration limit + version history (per idea, per session).
  // Select the stable parent objects and derive per-idea values outside the
  // hook — selecting `s.versions[ideaId] ?? []` returns a new array each render
  // and trips Zustand's "getSnapshot should be cached" loop guard.
  const regenerationCount = useRegenerationStore((s) => s.regenerationCount)
  const allVersions = useRegenerationStore((s) => s.versions)
  const increment = useRegenerationStore((s) => s.increment)
  const decrement = useRegenerationStore((s) => s.decrement)
  const addVersion = useRegenerationStore((s) => s.addVersion)
  const regenCount = regenerationCount[ideaId] ?? 0
  const versions = allVersions[ideaId] ?? []
  const atLimit = regenCount >= MAX_REGENERATIONS

  // Run once on mount: restore a previous session before generating anything.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void init()
    return () => abortRef.current?.abort()
  }, [])

  // Restore a saved caption (from the Post table) and/or saved slides (from
  // localStorage) instead of regenerating. Only generate what's missing.
  async function init() {
    let restoredCaption = false
    let restoredSlides = false

    try {
      const res = await fetch(`/api/posts?ideaId=${ideaId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.post?.caption) {
          setCaption(data.post.caption)
          setCaptionReady(true)
          restoredCaption = true
        }
      }
    } catch {
      // ignore — will stream a fresh caption below
    }

    try {
      const savedSlides = localStorage.getItem(`carouselSlides_${ideaId}`)
      if (savedSlides) {
        const parsed = JSON.parse(savedSlides) as Slide[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed)
          restoredSlides = true
        }
      }
    } catch {
      // corrupt/unavailable — ignore
    }

    if (restoredSlides) setStep(4) // jump to where they left off
    if (restoredCaption || restoredSlides) setRestored(true)
    if (!restoredCaption) streamCaption()
  }

  async function streamCaption(userInstruction?: string, currentCaption?: string) {
    setIsStreamingCaption(true)
    setCaptionReady(false)
    setCaption("")
    setError(null)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch("/api/generate/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, userInstruction, currentCaption }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error ?? "Caption generation failed")
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const hookIdx = buffer.indexOf("---HOOKS---")
        setCaption((hookIdx !== -1 ? buffer.slice(0, hookIdx) : buffer).trimEnd())
      }

      const hookIdx = buffer.indexOf("---HOOKS---")
      setCaption((hookIdx !== -1 ? buffer.slice(0, hookIdx) : buffer).trimEnd())
      setCaptionReady(true)
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsStreamingCaption(false)
    }
  }

  async function generateSlides(userInstruction?: string, currentSlides?: string) {
    setIsGeneratingSlides(true)
    setSlides(null)
    setError(null)

    try {
      console.log("Sending reference image:", !!referenceImage)
      const res = await fetch("/api/generate/carousel-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          caption,
          size,
          referenceImage: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
          userInstruction,
          currentSlides,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Generation failed")

      setSlides(data.slides)
      trackHistory(ideaId, "CAROUSEL_DONE")
      try {
        localStorage.setItem(`carouselSlides_${ideaId}`, JSON.stringify(data.slides))
      } catch {
        // persistence is best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let callers (handleRegenerateSlides) know it failed
    } finally {
      setIsGeneratingSlides(false)
    }
  }

  // User-initiated regeneration of the carousel — enforces the 2-per-session
  // limit and snapshots the current slides (as JSON) first. Reads the count
  // imperatively (getState) so it can't act on a stale render value, and
  // increments BEFORE generating so rapid clicks can't slip through.
  async function handleRegenerateSlides() {
    console.log("[REGEN-CHECK] ideaId:", ideaId, "count:", useRegenerationStore.getState().regenerationCount[ideaId] ?? 0)
    const currentCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
    if (currentCount >= MAX_REGENERATIONS) {
      setToastMsg("You've used all regenerations for this session")
      setTimeout(() => setToastMsg(null), 5000)
      return
    }
    if (slides) addVersion(ideaId, JSON.stringify(slides))
    // Capture the instruction + current slides, then clear the input. Sending
    // the current slides lets the API do a targeted edit instead of a rewrite.
    const userInstruction = slidesInstruction.trim() || undefined
    const currentSlides = userInstruction && slides ? JSON.stringify(slides) : undefined
    setSlidesInstruction("")
    // Reserve the slot synchronously BEFORE generating, so a second call can't
    // read a stale count and slip past the limit.
    increment(ideaId)
    try {
      await generateSlides(userInstruction, currentSlides)
      const newCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
      if (newCount >= MAX_REGENERATIONS) {
        setToastMsg("You've used both regenerations for this session")
        setTimeout(() => setToastMsg(null), 5000)
      }
    } catch {
      decrement(ideaId) // generation failed — refund the reserved slot
    }
  }

  // Step-1 "Regenerate caption" — was calling streamCaption() directly and
  // bypassing the limit. Now gated through the same 2-per-session budget.
  async function handleRegenerateCaption() {
    console.log("[REGEN-CHECK] ideaId:", ideaId, "count:", useRegenerationStore.getState().regenerationCount[ideaId] ?? 0)
    const currentCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
    if (currentCount >= MAX_REGENERATIONS) {
      setToastMsg("You've used all regenerations for this session")
      setTimeout(() => setToastMsg(null), 5000)
      return
    }
    if (caption) addVersion(ideaId, caption)
    // Capture the instruction + current caption, then clear the input. Sending
    // the current caption lets the API do a targeted edit instead of a rewrite.
    const userInstruction = captionInstruction.trim() || undefined
    const currentCaption = userInstruction ? caption : undefined
    setCaptionInstruction("")
    increment(ideaId)
    try {
      await streamCaption(userInstruction, currentCaption)
      const newCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
      if (newCount >= MAX_REGENERATIONS) {
        setToastMsg("You've used both regenerations for this session")
        setTimeout(() => setToastMsg(null), 5000)
      }
    } catch {
      decrement(ideaId)
    }
  }

  function handleRestoreSlides(content: string) {
    try {
      const parsed = JSON.parse(content) as Slide[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSlides(parsed)
        localStorage.setItem(`carouselSlides_${ideaId}`, content)
      }
    } catch {
      // corrupt snapshot — ignore
    }
  }

  // Readable preview for a stored slides snapshot (joined headlines).
  function slidesPreview(content: string): string {
    try {
      const parsed = JSON.parse(content) as Slide[]
      return parsed.map((s) => s.headline).join(" · ")
    } catch {
      return content
    }
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  // Regenerate a single slide's image. Sends persist:false so a regeneration
  // doesn't create a new Post — it just swaps the image in local state. Throws on
  // failure so the caller can refund the reserved regeneration slot.
  async function generateOneSlideImage(slideNumber: number): Promise<void> {
    const slide = slides?.find((s) => s.slideNumber === slideNumber)
    if (!slide) return

    setRegeneratingSlide(slideNumber)
    setError(null)
    try {
      const res = await fetch("/api/generate/carousel-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, size: size ?? "4:5", slides: [slide], persist: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Image generation failed")

      const image = data.slides[0] as SlideImage
      setSlideImages((prev) =>
        prev.map((img) => (img.slideNumber === slideNumber ? image : img)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let regenerateSlideImage refund the reserved slot on failure
    } finally {
      setRegeneratingSlide(null)
    }
  }

  // Generate every slide image in ONE request. The endpoint loops sequentially
  // and, on success, persists a single Post with one child Slide per image.
  async function generateAllSlideImages() {
    if (!slides) return
    setIsGeneratingImages(true)
    setError(null)
    setSlideImages([])

    try {
      const res = await fetch("/api/generate/carousel-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, size: size ?? "4:5", slides }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Image generation failed")
      setSlideImages(data.slides as SlideImage[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGeneratingImages(false)
    }
  }

  // "Regenerate Slide X" — gated by the same 2-per-idea regeneration budget as
  // the caption/slide-prompt regenerations.
  async function regenerateSlideImage(slideNumber: number) {
    console.log("[REGEN-CHECK] ideaId:", ideaId, "count:", useRegenerationStore.getState().regenerationCount[ideaId] ?? 0)
    const currentCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
    if (currentCount >= MAX_REGENERATIONS) {
      setToastMsg("You've used all regenerations for this session")
      setTimeout(() => setToastMsg(null), 5000)
      return
    }
    increment(ideaId)
    try {
      await generateOneSlideImage(slideNumber)
      const newCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
      if (newCount >= MAX_REGENERATIONS) {
        setToastMsg("You've used both regenerations for this session")
        setTimeout(() => setToastMsg(null), 5000)
      }
    } catch {
      decrement(ideaId)
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <Link
        href={`/idea/${ideaId}`}
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to breakdown
      </Link>

      <p className="text-[13px] text-[rgba(255,255,255,0.38)] leading-[1.5] max-w-2xl">{ideaHook}</p>

      {restored && (
        <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-[#A78BFA] bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)]">
          <History size={11} strokeWidth={2.2} />
          Restored from last session
        </span>
      )}

      {/* ── STEP 1: Caption Generation ── */}
      {step === 1 && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <h1 className="text-[22px] font-bold text-[rgba(255,255,255,0.9)]">Your Caption</h1>

          {isStreamingCaption && !caption && (
            <div className="flex flex-col gap-2.5">
              {SKELETON_WIDTHS.map((w, i) => (
                <div
                  key={i}
                  className="h-3.5 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse"
                  style={{ width: w }}
                />
              ))}
            </div>
          )}

          {caption && (
            <>
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[13px] text-[rgba(255,255,255,0.75)] leading-[1.65] resize-none focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
                />
                <p className="text-[11px] text-[rgba(255,255,255,0.24)] text-right tabular-nums">
                  {caption.length} chars
                </p>
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={captionInstruction}
                  onChange={(e) => setCaptionInstruction(e.target.value)}
                  disabled={isStreamingCaption || atLimit}
                  rows={2}
                  placeholder="What should change? (e.g. make it shorter, add more stats, make it funnier...)"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[13px] text-[rgba(255,255,255,0.75)] leading-[1.5] resize-none placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleRegenerateCaption}
                  disabled={isStreamingCaption || atLimit}
                  className="flex-shrink-0 px-3.5 py-2 rounded-lg bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.18)] border border-[rgba(124,58,237,0.2)] text-[12px] font-medium text-[#A78BFA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Regenerate caption
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
              {error}
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!captionReady}
            className={[
              "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
              captionReady
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.22)]"
                : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
            ].join(" ")}
          >
            Continue to Carousel →
          </button>
        </div>
      )}

      {/* ── STEP 2: Choose Ratio ── */}
      {step === 2 && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <h1 className="text-[22px] font-bold text-[rgba(255,255,255,0.9)]">Choose your image format</h1>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSize("4:5")}
              className={[
                "group flex flex-col items-center gap-5 p-6 rounded-2xl border transition-all duration-150 outline-none cursor-pointer",
                size === "4:5"
                  ? "border-[#7C3AED] bg-[rgba(124,58,237,0.1)] shadow-[0_0_28px_rgba(124,58,237,0.18)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.05)]",
              ].join(" ")}
            >
              <div
                className={[
                  "w-10 aspect-[4/5] rounded-lg transition-colors",
                  size === "4:5"
                    ? "bg-[rgba(124,58,237,0.35)] border border-[rgba(124,58,237,0.6)]"
                    : "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] group-hover:bg-[rgba(124,58,237,0.15)] group-hover:border-[rgba(124,58,237,0.3)]",
                ].join(" ")}
              />
              <div className="flex flex-col gap-1 text-center">
                <span
                  className={[
                    "text-[14px] font-semibold transition-colors",
                    size === "4:5" ? "text-[#C4B5FD]" : "text-[rgba(255,255,255,0.72)]",
                  ].join(" ")}
                >
                  4:5 Portrait
                </span>
                <span className="text-[12px] text-[rgba(255,255,255,0.32)]">Best for LinkedIn feed</span>
              </div>
            </button>

            <button
              onClick={() => setSize("1:1")}
              className={[
                "group flex flex-col items-center gap-5 p-6 rounded-2xl border transition-all duration-150 outline-none cursor-pointer",
                size === "1:1"
                  ? "border-[#7C3AED] bg-[rgba(124,58,237,0.1)] shadow-[0_0_28px_rgba(124,58,237,0.18)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(124,58,237,0.3)] hover:bg-[rgba(124,58,237,0.05)]",
              ].join(" ")}
            >
              <div
                className={[
                  "w-12 aspect-square rounded-lg transition-colors",
                  size === "1:1"
                    ? "bg-[rgba(124,58,237,0.35)] border border-[rgba(124,58,237,0.6)]"
                    : "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] group-hover:bg-[rgba(124,58,237,0.15)] group-hover:border-[rgba(124,58,237,0.3)]",
                ].join(" ")}
              />
              <div className="flex flex-col gap-1 text-center">
                <span
                  className={[
                    "text-[14px] font-semibold transition-colors",
                    size === "1:1" ? "text-[#C4B5FD]" : "text-[rgba(255,255,255,0.72)]",
                  ].join(" ")}
                >
                  1:1 Square
                </span>
                <span className="text-[12px] text-[rgba(255,255,255,0.32)]">Classic format</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!size}
              className={[
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
                size
                  ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.22)]"
                  : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
              ].join(" ")}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Reference Image ── */}
      {step === 3 && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-bold text-[rgba(255,255,255,0.9)]">
              Upload a style reference (optional)
            </h1>
            <p className="text-[13px] text-[rgba(255,255,255,0.38)]">
              We&apos;ll match the style across all slides — not copy the image
            </p>
          </div>

          <ReferenceUploader
            value={referenceImage}
            onChange={(b64, mediaType) => {
              setReferenceImage(b64)
              setReferenceMediaType(mediaType)
            }}
            onClear={() => setReferenceImage(null)}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                setReferenceImage(null)
                setStep(4)
              }}
              className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] text-[13px] font-medium text-[rgba(255,255,255,0.6)] transition-colors"
            >
              Skip, generate without reference
            </button>
            {referenceImage && (
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
              >
                Continue with reference →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 4: Final Screen ── */}
      {step === 4 && (
        <div className="flex flex-col gap-6">
          <button
            onClick={() => setStep(3)}
            className="self-start text-[12px] text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
          >
            ← Back
          </button>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Caption */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
                Caption
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[13px] text-[rgba(255,255,255,0.75)] leading-[1.65] resize-none focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-[12px] font-medium text-[rgba(255,255,255,0.52)] transition-colors"
                >
                  {captionCopied ? <Check size={12} /> : <Copy size={12} />}
                  {captionCopied ? "Copied!" : "Copy Caption"}
                </button>
              </div>
            </div>

            {/* Right: Slide prompts */}
            <div className="flex flex-col gap-4">
              {/* Generate button — shown before slides exist */}
              {!slides && !isGeneratingSlides && (
                <button
                  onClick={() => void generateSlides().catch(() => {})}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
                >
                  <Sparkles size={14} strokeWidth={2} />
                  Generate Slide Prompts
                </button>
              )}

              {/* Generating skeleton */}
              {isGeneratingSlides && (
                <div className="flex flex-col gap-2.5 pt-1">
                  <p className="text-[12px] text-[rgba(255,255,255,0.32)] animate-pulse">
                    Generating 7–8 slide prompts…
                  </p>
                  {SKELETON_WIDTHS.map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse"
                      style={{ width: w }}
                    />
                  ))}
                </div>
              )}

              {/* Slide list */}
              {slides && !isGeneratingSlides && (
                <div className="flex flex-col gap-4">
                  <CarouselSlideList slides={slides} />
                  <div className="flex items-end gap-2">
                    <textarea
                      value={slidesInstruction}
                      onChange={(e) => setSlidesInstruction(e.target.value)}
                      disabled={isGeneratingSlides || atLimit}
                      rows={2}
                      placeholder="What should change? (e.g. make it shorter, add more stats, make it funnier...)"
                      className="flex-1 px-3.5 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[13px] text-[rgba(255,255,255,0.75)] leading-[1.5] resize-none placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(124,58,237,0.4)] transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleRegenerateSlides}
                      disabled={isGeneratingSlides || atLimit}
                      className="flex-shrink-0 px-3.5 py-2 rounded-lg bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.18)] border border-[rgba(124,58,237,0.2)] text-[12px] font-medium text-[#A78BFA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Regenerate Slides
                    </button>
                  </div>
                  {/* Version history — silent, below the slides */}
                  <VersionHistory
                    versions={versions}
                    onRestore={handleRestoreSlides}
                    preview={slidesPreview}
                  />

                  {/* ── Generate actual slide images from the prompts ── */}
                  {slideImages.length === 0 && !isGeneratingImages && (
                    <button
                      onClick={() => setConfirmOpen(true)}
                      className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
                    >
                      <Sparkles size={14} strokeWidth={2} />
                      Generate All Slides as Images
                    </button>
                  )}

                  {isGeneratingImages && (
                    <div className="flex items-center gap-2.5 text-[13px] font-medium text-[#C4B5FD]">
                      <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />
                      Generating {slides.length} slide images… this can take 2–3 minutes.
                    </div>
                  )}

                  {slideImages.length > 0 && (
                    <CarouselImageGrid
                      images={slideImages}
                      size={size ?? "4:5"}
                      ideaId={ideaId}
                      onRegenerate={regenerateSlideImage}
                      regeneratingSlide={regeneratingSlide}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Regeneration limit toast */}
      <RegenerationLimit
        open={toastMsg !== null}
        message={toastMsg ?? ""}
        onClose={() => setToastMsg(null)}
      />

      {/* Confirm before spending image-generation credits on the full carousel */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate All Slide Images?</DialogTitle>
            <DialogDescription>
              This will generate {slides?.length ?? 0} images using AI. This takes 2-3 minutes
              and uses your image generation credits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfirmOpen(false)
                void generateAllSlideImages()
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
            >
              Yes, generate all →
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
