"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sparkles, Copy, Check, History, Loader2 } from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { VoiceGuidelinesToggle } from "@/components/generate/VoiceGuidelinesToggle"
import { CarouselImageGrid, type SlideImage } from "@/components/generate/CarouselImageGrid"
import { PostToLinkedInButton } from "@/components/generate/PostToLinkedInButton"
import { LoadingGame } from "@/components/generate/LoadingGame"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
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
import { friendlyGenerationError } from "@/lib/friendlyError"
import { countWords } from "@/lib/wordCount"

// TEMP DEBUG — when true, generateCarouselFlow stops after slide prompts come
// back and renders them as text instead of generating images (no OpenAI image
// spend). Set back to false / remove to restore the full flow.
const DEBUG_SKIP_IMAGE_GENERATION = true

interface CarouselClientProps {
  ideaId: string
  ideaHook: string
  hasGuidelines: boolean
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

export function CarouselClient({ ideaId, ideaHook, hasGuidelines }: CarouselClientProps) {
  const router = useRouter()
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

  // Step 4b — actual slide images generated from the prompts (one at a time)
  const [slideImages, setSlideImages] = useState<SlideImage[]>([])
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  // Once image generation has started, keep the 2-column layout (with the
  // LoadingGame) so the user can keep playing even after the carousel is done.
  const [gameStarted, setGameStarted] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [restored, setRestored] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [captionInstruction, setCaptionInstruction] = useState("")
  // Opt-in flag: apply the user's saved voice guidelines on caption regeneration.
  const [useVoiceGuidelines, setUseVoiceGuidelines] = useState(false)
  // Per-slide custom instructions for individual slide regeneration, keyed by
  // slideNumber. Cleared per slide on that slide's successful regeneration.
  const [slideInstructions, setSlideInstructions] = useState<Record<number, string>>({})
  // Shown when changing the reference image invalidates an already-generated
  // carousel (the old style is baked into those slide prompts).
  const [referenceNotice, setReferenceNotice] = useState<string | null>(null)
  // LinkedIn "these post as separate images, not swipeable slides" warning. Held
  // open while we await the user's choice; the pending promise resolver lets the
  // dialog's buttons drive the intercepted post-to-LinkedIn flow.
  const [linkedInWarnOpen, setLinkedInWarnOpen] = useState(false)
  const linkedInResolve = useRef<((proceed: boolean) => void) | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const didInit = useRef(false)

  // Regeneration limit + version history (per idea, per session).
  // Select the stable parent objects and derive per-idea values outside the
  // hook — selecting `s.versions[ideaId] ?? []` returns a new array each render
  // and trips Zustand's "getSnapshot should be cached" loop guard.
  const regenerationCount = useRegenerationStore((s) => s.regenerationCount)
  const increment = useRegenerationStore((s) => s.increment)
  const decrement = useRegenerationStore((s) => s.decrement)
  const addVersion = useRegenerationStore((s) => s.addVersion)
  const regenCount = regenerationCount[ideaId] ?? 0
  const atLimit = regenCount >= MAX_REGENERATIONS

  // Run once on mount: restore a previous session before generating anything.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void init()
    return () => abortRef.current?.abort()
  }, [])

  // Restore everything saved for this idea from localStorage (caption, slide
  // prompts, slide images, size) and jump to the right step. NEVER auto-regenerate
  // when saved data exists — the user must click Regenerate explicitly. Only a
  // completely fresh idea (nothing saved anywhere) auto-generates the caption.
  async function init() {
    let savedCaption: string | null = null
    let savedSlides: Slide[] | null = null
    let savedImages: SlideImage[] | null = null
    let savedSize: ImageSize | null = null

    try {
      savedCaption = localStorage.getItem(`carouselCaption_${ideaId}`)

      const slidesRaw = localStorage.getItem(`carouselSlides_${ideaId}`)
      if (slidesRaw) {
        const parsed = JSON.parse(slidesRaw) as Slide[]
        if (Array.isArray(parsed) && parsed.length > 0) savedSlides = parsed
      }

      const imagesRaw = localStorage.getItem(`carouselImages_${ideaId}`)
      if (imagesRaw) {
        const parsed = JSON.parse(imagesRaw) as SlideImage[]
        if (Array.isArray(parsed) && parsed.length > 0) savedImages = parsed
      }

      const s = localStorage.getItem(`carouselSize_${ideaId}`)
      if (s === "4:5" || s === "1:1") savedSize = s
    } catch {
      // corrupt/unavailable — fall through
    }

    // Legacy fallback: caption may live in the Post table from before this
    // localStorage scheme existed.
    if (!savedCaption) {
      try {
        const res = await fetch(`/api/posts?ideaId=${ideaId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.post?.caption) savedCaption = data.post.caption
        }
      } catch {
        // ignore — treated as no saved caption
      }
    }

    if (savedSize) setSize(savedSize)
    if (savedCaption) {
      setCaption(savedCaption)
      setCaptionReady(true)
    }
    if (savedSlides) setSlides(savedSlides)
    if (savedImages) setSlideImages(savedImages)

    const hasAnySaved = !!(savedCaption || savedSlides || savedImages || savedSize)
    if (hasAnySaved) setRestored(true)

    // Jump to the furthest step the saved data supports.
    if (savedSlides || savedImages) setStep(4)
    else if (savedCaption) setStep(2)
    else setStep(1)

    // No auto-generation on mount. A brand-new idea lands on step 1 with the
    // voice-guidelines toggle + a "Generate Caption" button, so the user can set
    // their preference before the first caption is generated.
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
        body: JSON.stringify({ ideaId, userInstruction, currentCaption, useVoiceGuidelines }),
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
      const finalCaption = (hookIdx !== -1 ? buffer.slice(0, hookIdx) : buffer).trimEnd()
      setCaption(finalCaption)
      setCaptionReady(true)
      persistCaption(finalCaption)
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsStreamingCaption(false)
    }
  }

  // ── localStorage persistence helpers (keyed per ideaId) ──
  function persistCaption(value: string) {
    try {
      localStorage.setItem(`carouselCaption_${ideaId}`, value)
    } catch {
      // best-effort
    }
  }

  // Caption edits are persisted too, so navigating back restores the latest text.
  function handleCaptionChange(value: string) {
    setCaption(value)
    persistCaption(value)
  }

  function persistImages(images: SlideImage[]) {
    try {
      localStorage.setItem(`carouselImages_${ideaId}`, JSON.stringify(images))
    } catch {
      // best-effort
    }
  }

  function selectSize(s: ImageSize) {
    setSize(s)
    try {
      localStorage.setItem(`carouselSize_${ideaId}`, s)
    } catch {
      // best-effort
    }
  }

  // The reference image is baked into each slide's prompt at generation time, so
  // changing/removing it makes any already-generated carousel stale. Clear those
  // saved slides/images and bounce the user out of step 4 so they regenerate
  // with the new style. No-op for a carousel that hasn't been generated yet.
  function invalidateGeneratedCarousel() {
    if (!slides && slideImages.length === 0) return
    setSlides(null)
    setSlideImages([])
    setGameStarted(false)
    try {
      localStorage.removeItem(`carouselSlides_${ideaId}`)
      localStorage.removeItem(`carouselImages_${ideaId}`)
    } catch {
      // best-effort
    }
    setReferenceNotice(
      "Reference image changed — please regenerate your carousel to apply the new style.",
    )
    if (step === 4) setStep(3)
  }

  function handleReferenceChange(b64: string, mediaType: string) {
    setReferenceImage(b64)
    setReferenceMediaType(mediaType)
    invalidateGeneratedCarousel()
  }

  function handleReferenceClear() {
    setReferenceImage(null)
    invalidateGeneratedCarousel()
  }

  // Single-button flow: silently generate the slide prompts, then generate the
  // slide images ONE AT A TIME from the client so each appears in the grid the
  // moment it's ready and progress is shown live. Slides are kept in state +
  // localStorage so per-slide Regenerate keeps working.
  async function generateCarouselFlow() {
    setError(null)
    setReferenceNotice(null)
    setSlideImages([])

    // Step 1 — slide prompts (silent).
    setIsGeneratingSlides(true)
    setGameStarted(true) // keep the game visible for the whole flow
    setLoadingMessage("Building your carousel structure...")

    let generatedSlides: Slide[]
    try {
      const promptRes = await fetch("/api/generate/carousel-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          caption,
          size,
          referenceImage: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
        }),
      })
      const promptData = await promptRes.json()
      if (!promptRes.ok) {
        // Pro-gated (Free user hitting carousels) → send them to upgrade.
        if (promptData.requiresUpgrade) {
          setIsGeneratingSlides(false)
          router.push("/settings/billing")
          return
        }
        throw new Error((promptData as { error?: string }).error ?? "Generation failed")
      }
      generatedSlides = promptData.slides as Slide[]
      setSlides(generatedSlides)
      trackHistory(ideaId, "CAROUSEL_DONE")
      try {
        localStorage.setItem(`carouselSlides_${ideaId}`, JSON.stringify(generatedSlides))
      } catch {
        // best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setIsGeneratingSlides(false)
      return
    }
    setIsGeneratingSlides(false)

    // TEMP DEBUG — stop before image generation; the step-4 debug panel below
    // renders the raw prompts instead.
    if (DEBUG_SKIP_IMAGE_GENERATION) {
      setGameStarted(false)
      setLoadingMessage("")
      return
    }

    // Step 2 — generate images ONE BY ONE from the client. Each call generates a
    // single slide and does NOT persist (persist: false), so no junk Posts.
    setIsGeneratingImages(true)
    const generatedImages: SlideImage[] = []

    for (let i = 0; i < generatedSlides.length; i++) {
      const slide = generatedSlides[i]
      setLoadingMessage(`Generating slide ${i + 1} of ${generatedSlides.length}...`)

      try {
        const imgRes = await fetch("/api/generate/carousel-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slides: [slide], // ONE slide only
            size: size ?? "4:5",
            ideaId,
            persist: false,
            referenceImage: referenceImage ?? undefined,
            referenceMediaType: referenceImage ? referenceMediaType : undefined,
          }),
        })
        const imgData = await imgRes.json()
        if (imgData.slides?.[0]) {
          generatedImages.push(imgData.slides[0] as SlideImage)
          setSlideImages([...generatedImages]) // show each image as it arrives
        }
      } catch (err) {
        console.error(`[carousel] slide ${i + 1} failed:`, err)
      }
    }

    setIsGeneratingImages(false)
    persistImages(generatedImages)

    // After ALL slides are generated, persist the whole carousel to the DB in one
    // call. generatedImages already carry slideNumber/role/headline/imageUrl, so
    // we send them directly (no fragile index-merge with the prompt slides).
    if (generatedImages.length > 0) {
      try {
        await fetch("/api/generate/carousel-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slides: generatedImages,
            size: size ?? "4:5",
            ideaId,
            persistOnly: true, // just save to DB, no image generation
          }),
        })
      } catch (err) {
        console.error("[carousel] DB persist failed:", err)
      }
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

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  // Gate passed to PostToLinkedInButton: open the "separate images, not swipeable
  // slides" warning and resolve with the user's choice. Returns true to proceed
  // with posting, false to cancel.
  function confirmLinkedInPost(): Promise<boolean> {
    return new Promise((resolve) => {
      linkedInResolve.current = resolve
      setLinkedInWarnOpen(true)
    })
  }

  function resolveLinkedInWarn(proceed: boolean) {
    setLinkedInWarnOpen(false)
    linkedInResolve.current?.(proceed)
    linkedInResolve.current = null
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
      const userInstruction = slideInstructions[slideNumber]?.trim() || undefined
      const res = await fetch("/api/generate/carousel-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          size: size ?? "4:5",
          slides: [slide],
          persist: false,
          userInstruction,
          referenceImage: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Image generation failed")

      const image = data.slides[0] as SlideImage
      setSlideImages((prev) => {
        const next = prev.map((img) => (img.slideNumber === slideNumber ? image : img))
        persistImages(next)
        return next
      })
      // Clear this slide's instruction box on success.
      setSlideInstructions((prev) => {
        const next = { ...prev }
        delete next[slideNumber]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let regenerateSlideImage refund the reserved slot on failure
    } finally {
      setRegeneratingSlide(null)
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

  // The step-4 caption + carousel grid. Rendered centered normally; once image
  // generation has started it moves into a 70% left column with the LoadingGame
  // on the right.
  const carouselGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Left: Caption */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
          Caption
        </p>
        <textarea
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          rows={20}
          className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.65] resize-none focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
        />
        {countWords(caption) > 0 && (
          <p className="text-[11px] text-[#ADA99F] tabular-nums">{countWords(caption)} words</p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCaption}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] hover:bg-[#E9E7E1] text-[12px] font-medium text-[#6B7280] transition-colors"
          >
            {captionCopied ? <Check size={12} /> : <Copy size={12} />}
            {captionCopied ? "Copied!" : "Copy Caption"}
          </button>
          {slideImages.length > 0 && !isGeneratingImages && (
            <PostToLinkedInButton
              caption={caption}
              imageUrls={slideImages
                .map((s) => s.imageUrl)
                .filter((u): u is string => !!u)}
              disabled={isGeneratingImages}
              beforePost={confirmLinkedInPost}
            />
          )}
        </div>
      </div>

      {/* Right: carousel images (the slide-prompt step is bypassed) */}
      <div className="flex flex-col gap-4">
        {/* Single button — confirm, then generate prompts + all images in one go */}
        {slideImages.length === 0 && !isGeneratingSlides && !isGeneratingImages && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
          >
            <Sparkles size={14} strokeWidth={2} />
            Generate Carousel
          </button>
        )}

        {(isGeneratingSlides || isGeneratingImages) && loadingMessage && (
          <div className="flex items-center gap-2.5 text-[13px] font-medium text-[#1A1A1A]">
            <Loader2 size={15} className="animate-spin" strokeWidth={2.2} />
            {loadingMessage}
          </div>
        )}

        {/* Grid fills in one image at a time as each slide is generated */}
        {slideImages.length > 0 && (
          <CarouselImageGrid
            images={slideImages}
            size={size ?? "4:5"}
            ideaId={ideaId}
            onRegenerate={regenerateSlideImage}
            regeneratingSlide={regeneratingSlide}
            instructions={slideInstructions}
            onInstructionChange={(slideNumber, value) =>
              setSlideInstructions((prev) => ({ ...prev, [slideNumber]: value }))
            }
          />
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <Link
        href={`/idea/${ideaId}`}
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to breakdown
      </Link>

      <p className="text-[13px] text-[#9CA3AF] leading-[1.5] max-w-2xl">{ideaHook}</p>

      {restored && (
        <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-[#1A1A1A] bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.2)]">
          <History size={11} strokeWidth={2.2} />
          Restored from last session
        </span>
      )}

      {/* ── STEP 1: Caption Generation ── */}
      {step === 1 && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <h1 className="text-[22px] font-bold text-[#0A0A0A]">Your Caption</h1>

          {isStreamingCaption && !caption && (
            <div className="flex flex-col gap-2.5">
              {SKELETON_WIDTHS.map((w, i) => (
                <div
                  key={i}
                  className="h-3.5 rounded-full bg-[#ECEAE4] animate-pulse"
                  style={{ width: w }}
                />
              ))}
            </div>
          )}

          {/* First generation — no caption yet. The voice-guidelines toggle sits
              above the button so the user can opt in before generating. */}
          {!caption && !isStreamingCaption && (
            <div className="flex flex-col gap-4">
              <VoiceGuidelinesToggle
                hasGuidelines={hasGuidelines}
                value={useVoiceGuidelines}
                onChange={setUseVoiceGuidelines}
              />
              <button
                onClick={() => void streamCaption()}
                className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
              >
                <Sparkles size={14} strokeWidth={2} />
                Generate Caption
              </button>
            </div>
          )}

          {caption && (
            <>
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={caption}
                  onChange={(e) => handleCaptionChange(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.65] resize-none focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors"
                />
                <div className="flex items-center justify-between text-[11px] text-[#ADA99F] tabular-nums">
                  <span>{countWords(caption) > 0 ? `${countWords(caption)} words` : ""}</span>
                  <span>{caption.length} chars</span>
                </div>
              </div>
              <VoiceGuidelinesToggle
                hasGuidelines={hasGuidelines}
                value={useVoiceGuidelines}
                onChange={setUseVoiceGuidelines}
              />
              <div className="flex items-end gap-2">
                <textarea
                  value={captionInstruction}
                  onChange={(e) => setCaptionInstruction(e.target.value)}
                  disabled={isStreamingCaption || atLimit}
                  rows={2}
                  placeholder="What should change? (e.g. make it shorter, add more stats, make it funnier...)"
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.5] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleRegenerateCaption}
                  disabled={isStreamingCaption || atLimit}
                  className="flex-shrink-0 px-3.5 py-2 rounded-lg bg-[rgba(26,26,26,0.1)] hover:bg-[rgba(26,26,26,0.18)] border border-[rgba(26,26,26,0.2)] text-[12px] font-medium text-[#1A1A1A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Regenerate caption
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="flex flex-col gap-3">
              <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
                {friendlyGenerationError(error)}
              </div>
              <button
                onClick={() => void streamCaption()}
                disabled={isStreamingCaption}
                className="self-start text-[13px] font-medium text-[#1A1A1A] hover:text-black transition-colors disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={!captionReady}
            className={[
              "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
              captionReady
                ? "bg-[#1A1A1A] hover:bg-[#000000] cursor-pointer shadow-[0_0_24px_rgba(26,26,26,0.22)]"
                : "bg-[rgba(26,26,26,0.3)] cursor-not-allowed opacity-50",
            ].join(" ")}
          >
            Continue to Carousel →
          </button>
        </div>
      )}

      {/* ── STEP 2: Choose Ratio ── */}
      {step === 2 && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <h1 className="text-[22px] font-bold text-[#0A0A0A]">Choose your image format</h1>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => selectSize("4:5")}
              className={[
                "group flex flex-col items-center gap-5 p-6 rounded-2xl border transition-all duration-150 outline-none cursor-pointer",
                size === "4:5"
                  ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.1)] shadow-[0_0_28px_rgba(26,26,26,0.18)]"
                  : "border-[#E5E3DE] bg-[#F4F2EC] hover:border-[rgba(26,26,26,0.3)] hover:bg-[rgba(26,26,26,0.05)]",
              ].join(" ")}
            >
              <div
                className={[
                  "w-10 aspect-[4/5] rounded-lg transition-colors",
                  size === "4:5"
                    ? "bg-[rgba(26,26,26,0.35)] border border-[rgba(26,26,26,0.6)]"
                    : "bg-[#E5E3DE] border border-[#E5E3DE] group-hover:bg-[rgba(26,26,26,0.15)] group-hover:border-[rgba(26,26,26,0.3)]",
                ].join(" ")}
              />
              <div className="flex flex-col gap-1 text-center">
                <span
                  className={[
                    "text-[14px] font-semibold transition-colors",
                    size === "4:5" ? "text-[#1A1A1A]" : "text-[#374151]",
                  ].join(" ")}
                >
                  4:5 Portrait
                </span>
                <span className="text-[12px] text-[#9CA3AF]">Best for LinkedIn feed</span>
              </div>
            </button>

            <button
              onClick={() => selectSize("1:1")}
              className={[
                "group flex flex-col items-center gap-5 p-6 rounded-2xl border transition-all duration-150 outline-none cursor-pointer",
                size === "1:1"
                  ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.1)] shadow-[0_0_28px_rgba(26,26,26,0.18)]"
                  : "border-[#E5E3DE] bg-[#F4F2EC] hover:border-[rgba(26,26,26,0.3)] hover:bg-[rgba(26,26,26,0.05)]",
              ].join(" ")}
            >
              <div
                className={[
                  "w-12 aspect-square rounded-lg transition-colors",
                  size === "1:1"
                    ? "bg-[rgba(26,26,26,0.35)] border border-[rgba(26,26,26,0.6)]"
                    : "bg-[#E5E3DE] border border-[#E5E3DE] group-hover:bg-[rgba(26,26,26,0.15)] group-hover:border-[rgba(26,26,26,0.3)]",
                ].join(" ")}
              />
              <div className="flex flex-col gap-1 text-center">
                <span
                  className={[
                    "text-[14px] font-semibold transition-colors",
                    size === "1:1" ? "text-[#1A1A1A]" : "text-[#374151]",
                  ].join(" ")}
                >
                  1:1 Square
                </span>
                <span className="text-[12px] text-[#9CA3AF]">Classic format</span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#374151] transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!size}
              className={[
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
                size
                  ? "bg-[#1A1A1A] hover:bg-[#000000] cursor-pointer shadow-[0_0_24px_rgba(26,26,26,0.22)]"
                  : "bg-[rgba(26,26,26,0.3)] cursor-not-allowed opacity-50",
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
            <h1 className="text-[22px] font-bold text-[#0A0A0A]">
              Upload a style reference (optional)
            </h1>
            <p className="text-[13px] text-[#9CA3AF]">
              We&apos;ll match the style across all slides — not copy the image
            </p>
          </div>

          <ReferenceUploader
            value={referenceImage}
            onChange={handleReferenceChange}
            onClear={handleReferenceClear}
          />

          {referenceNotice && (
            <p className="text-[12px] text-[#D97706] leading-[1.5]">{referenceNotice}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#9CA3AF] hover:text-[#374151] transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                handleReferenceClear()
                setStep(4)
              }}
              className="px-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#F1EFE9] hover:bg-[#E9E7E1] text-[13px] font-medium text-[#4B5563] transition-colors"
            >
              Skip, generate without reference
            </button>
            {referenceImage && (
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
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
            className="self-start text-[12px] text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
          >
            ← Back
          </button>

          {error && (
            <div className="flex flex-col gap-3">
              <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
                {friendlyGenerationError(error)}
              </div>
              <button
                onClick={() => void generateCarouselFlow()}
                disabled={isGeneratingSlides || isGeneratingImages}
                className="self-start text-[13px] font-medium text-[#1A1A1A] hover:text-black transition-colors disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          )}

          {/* TEMP DEBUG — prompts-only view when image generation is skipped */}
          {DEBUG_SKIP_IMAGE_GENERATION && slides && slideImages.length === 0 && (
            <div className="flex flex-col gap-4 p-4">
              <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-700">
                DEBUG MODE — prompts only, no images generated
              </div>
              {slides.map((slide) => (
                <div
                  key={slide.slideNumber}
                  className="flex flex-col gap-2 p-4 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC]"
                >
                  <p className="text-[12px] font-semibold text-[#0A0A0A]">
                    Slide {slide.slideNumber} ({slide.role}): {slide.headline}
                  </p>
                  <pre className="whitespace-pre-wrap text-[11px] text-[#374151] leading-relaxed font-sans">
                    {slide.prompt}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Once generation has started, keep the 2-column layout (caption+images
              left, game right) so the user can keep playing after the carousel is
              done. Before that, the normal centered grid. */}
          {gameStarted ? (
            <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
              <div style={{ flex: "0 0 70%", maxWidth: "70%" }}>{carouselGrid}</div>
              <div style={{ flex: "0 0 28%", maxWidth: "28%" }}>
                <LoadingGame />
              </div>
            </div>
          ) : (
            carouselGrid
          )}
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
            <DialogTitle>Generate Carousel?</DialogTitle>
            <DialogDescription>
              This will generate 7-8 slide images. Takes 2-3 minutes and uses your image
              generation credits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setConfirmOpen(false)
                void generateCarouselFlow()
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
            >
              Yes, generate →
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warn that a multi-image LinkedIn post renders as separate images, not a
          swipeable slide deck, before actually posting. */}
      <Dialog
        open={linkedInWarnOpen}
        onOpenChange={(open) => {
          // Any dismissal (overlay/esc/close) counts as "Go Back" — don't post.
          if (!open) resolveLinkedInWarn(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ⚠️ Heads up — LinkedIn will show these as separate images, not swipeable
              slides.
            </DialogTitle>
            <DialogDescription>
              For the best carousel experience (swipeable slides), download the images and
              upload them manually to LinkedIn as a PDF document.
              <br />
              <br />
              How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => resolveLinkedInWarn(false)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => resolveLinkedInWarn(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] transition-colors"
            >
              Upload as Images
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
