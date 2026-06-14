"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Copy, Check, History, Download, RefreshCw, Loader2 } from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { ImagePreview } from "@/components/generate/ImagePreview"
import { LoadingGame } from "@/components/generate/LoadingGame"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"

interface ImageClientProps {
  ideaId: string
  ideaHook: string
}

type Step = 1 | 2 | 3 | 4
type ImageSize = "4:5" | "1:1"

const SKELETON_WIDTHS = ["88%", "72%", "95%", "65%", "80%", "55%", "70%", "40%"]

export function ImageClient({ ideaId, ideaHook }: ImageClientProps) {
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

  // Step 4 — image prompt is generated silently (not shown); only the final
  // image is rendered.
  const [imagePrompt, setImagePrompt] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [restored, setRestored] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [captionInstruction, setCaptionInstruction] = useState("")
  // Once image generation has started at least once, keep the 2-column layout
  // (with the LoadingGame) so the user can keep playing even after the image loads.
  const [gameStarted, setGameStarted] = useState(false)

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

  // Restore everything saved for this idea from localStorage (caption, prompt,
  // image, size) and jump to the right step. NEVER auto-regenerate when saved
  // data exists — the user must click Regenerate explicitly. Only a completely
  // fresh idea (nothing saved anywhere) auto-generates the first caption.
  async function init() {
    let savedCaption: string | null = null
    let savedPrompt: string | null = null
    let savedImageUrl: string | null = null
    let savedSize: ImageSize | null = null

    try {
      savedCaption = localStorage.getItem(`imageCaption_${ideaId}`)
      savedPrompt = localStorage.getItem(`imagePrompt_${ideaId}`)
      savedImageUrl = localStorage.getItem(`imageUrl_${ideaId}`)
      const s = localStorage.getItem(`imageSize_${ideaId}`)
      if (s === "4:5" || s === "1:1") savedSize = s
    } catch {
      // localStorage unavailable — fall through
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
    if (savedPrompt) setImagePrompt(savedPrompt)
    if (savedImageUrl) setImageUrl(savedImageUrl)

    const hasAnySaved = !!(savedCaption || savedPrompt || savedImageUrl || savedSize)
    if (hasAnySaved) setRestored(true)

    // Jump to the furthest step the saved data supports.
    if (savedImageUrl || savedPrompt) setStep(4)
    else if (savedCaption) setStep(2)
    else setStep(1)

    // Auto-generate the caption ONLY for a brand-new idea with nothing saved.
    if (!hasAnySaved) streamCaption()
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
      localStorage.setItem(`imageCaption_${ideaId}`, value)
    } catch {
      // best-effort
    }
  }

  // Caption edits are persisted too, so navigating back restores the latest text.
  function handleCaptionChange(value: string) {
    setCaption(value)
    persistCaption(value)
  }

  function selectSize(s: ImageSize) {
    setSize(s)
    try {
      localStorage.setItem(`imageSize_${ideaId}`, s)
    } catch {
      // best-effort
    }
  }

  // Single-button flow: silently generate the image prompt, then immediately use
  // it to generate the image. Only the final image is shown. The prompt is still
  // kept in state + localStorage so Copy Prompt and Regenerate Image keep working.
  async function generateImageFlow() {
    setIsGeneratingImage(true)
    setGameStarted(true) // keep the game visible from now on
    setError(null)
    setImageUrl(null)
    setPostId(null)

    try {
      // 1) Generate the image prompt silently (no UI update).
      const promptRes = await fetch("/api/generate/image-prompt", {
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
        throw new Error((promptData as { error?: string }).error ?? "Generation failed")
      }
      const newPrompt = promptData.imagePrompt as string
      setImagePrompt(newPrompt)
      try {
        localStorage.setItem(`imagePrompt_${ideaId}`, newPrompt)
      } catch {
        // best-effort
      }
      trackHistory(ideaId, "IMAGE_DONE")

      // 2) Immediately generate the image from that prompt.
      const imgRes = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, imagePrompt: newPrompt, caption, size }),
      })
      const imgData = await imgRes.json()
      if (!imgRes.ok) {
        throw new Error((imgData as { error?: string }).error ?? "Image generation failed")
      }
      setImageUrl(imgData.imageUrl)
      setPostId(imgData.postId)
      try {
        localStorage.setItem(`imageUrl_${ideaId}`, imgData.imageUrl)
      } catch {
        // best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let handleRegenerateImage refund the reserved slot on failure
    } finally {
      setIsGeneratingImage(false)
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

  async function generateImage() {
    if (!imagePrompt) return
    setIsGeneratingImage(true)
    setGameStarted(true) // keep the game visible from now on
    setError(null)
    setImageUrl(null)
    setPostId(null)

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, imagePrompt, caption, size }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Image generation failed")

      setImageUrl(data.imageUrl)
      setPostId(data.postId)
      try {
        localStorage.setItem(`imageUrl_${ideaId}`, data.imageUrl)
      } catch {
        // best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let handleRegenerateImage refund the reserved slot on failure
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // "Regenerate Image" is a real regeneration, so it's gated by the same
  // 2-per-idea budget as prompt/caption regens. The FIRST image generation goes
  // through generateImage() directly and does NOT count toward the limit.
  async function handleRegenerateImage() {
    console.log("[REGEN-CHECK] ideaId:", ideaId, "count:", useRegenerationStore.getState().regenerationCount[ideaId] ?? 0)
    const currentCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
    if (currentCount >= MAX_REGENERATIONS) {
      setToastMsg("You've used all regenerations for this session")
      setTimeout(() => setToastMsg(null), 5000)
      return
    }
    // Reserve the slot synchronously BEFORE generating so rapid clicks can't
    // read a stale count and slip past the limit.
    increment(ideaId)
    try {
      await generateImage()
      const newCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
      if (newCount >= MAX_REGENERATIONS) {
        setToastMsg("You've used both regenerations for this session")
        setTimeout(() => setToastMsg(null), 5000)
      }
    } catch {
      decrement(ideaId) // generation failed — refund the reserved slot
    }
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
  }

  async function handleCopyPrompt() {
    if (!imagePrompt) return
    await navigator.clipboard.writeText(imagePrompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  // Route through the same-origin proxy so R2's CORS policy can't block the
  // fetch, then download the bytes as carouselabs-image-[ideaId].png. If the
  // proxy fetch fails, fall back to opening the original image in a new tab.
  async function handleDownloadImage() {
    if (!imageUrl) return
    setDownloading(true)
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carouselabs-image-${ideaId}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(imageUrl, "_blank") // fallback — open original in new tab to save
    } finally {
      setDownloading(false)
    }
  }

  async function handleSaveDraft() {
    if (!postId) return
    try {
      await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // post already saved on generation
    }
  }

  // The step-4 caption + image grid. Rendered centered normally; while the image
  // is generating it moves into a 70% left column with the LoadingGame on the right.
  const imageGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Left: Caption */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
          Caption
        </p>
        <textarea
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
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
          {postId && (
            <button
              onClick={handleSaveDraft}
              className="px-3.5 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-[12px] font-medium text-[rgba(255,255,255,0.52)] transition-colors"
            >
              {saved ? "Saved!" : "Save Draft"}
            </button>
          )}
        </div>
      </div>

      {/* Right: generated image (the prompt step is bypassed) */}
      <div className="flex flex-col gap-4">
        {imageUrl && !isGeneratingImage && (
          <div className="flex flex-col gap-3">
            <ImagePreview
              src={imageUrl}
              alt="Generated LinkedIn image"
              size={size ?? undefined}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadImage}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
                ) : (
                  <Download size={13} strokeWidth={2.2} />
                )}
                {downloading ? "Downloading…" : "Download HD Image"}
              </button>
              <button
                onClick={handleRegenerateImage}
                disabled={atLimit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.14)] text-[12px] font-medium text-[#C4B5FD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} strokeWidth={2.2} />
                Regenerate Image
              </button>
              <button
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-[12px] font-medium text-[rgba(255,255,255,0.52)] transition-colors"
              >
                {promptCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                {promptCopied ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
          </div>
        )}

        {isGeneratingImage && (
          <div
            className={[
              "flex flex-col items-center justify-center gap-4 rounded-2xl bg-[rgba(124,58,237,0.04)] border border-[rgba(124,58,237,0.12)]",
              size === "1:1" ? "aspect-square" : "aspect-[4/5]",
            ].join(" ")}
          >
            <div className="h-10 w-10 rounded-full border-2 border-[rgba(124,58,237,0.25)] border-t-[#7C3AED] animate-spin" />
            <p className="text-[13px] font-medium text-[#C4B5FD]">
              Generating your image…
            </p>
            <p className="text-[11px] text-[rgba(255,255,255,0.32)]">(this can take up to a minute)</p>
          </div>
        )}

        {/* Single button — generates the prompt then the image in one go. */}
        {!imageUrl && !isGeneratingImage && (
          <button
            onClick={() => void generateImageFlow().catch(() => {})}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
          >
            <Sparkles size={14} strokeWidth={2} />
            Generate Image
          </button>
        )}
      </div>
    </div>
  )

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
                  onChange={(e) => handleCaptionChange(e.target.value)}
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
            Continue to Image →
          </button>
        </div>
      )}

      {/* ── STEP 2: Choose Ratio ── */}
      {step === 2 && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <h1 className="text-[22px] font-bold text-[rgba(255,255,255,0.9)]">Choose your image format</h1>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => selectSize("4:5")}
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
              onClick={() => selectSize("1:1")}
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
              We&apos;ll match the style — not copy the image
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

          {/* Once generation has started, keep the 2-column layout (caption+image
              left, game right) so the user can keep playing after the image loads.
              Before that, the normal centered grid. */}
          {gameStarted ? (
            <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
              <div style={{ flex: "0 0 70%", maxWidth: "70%" }}>{imageGrid}</div>
              <div style={{ flex: "0 0 28%", maxWidth: "28%" }}>
                <LoadingGame />
              </div>
            </div>
          ) : (
            imageGrid
          )}
        </div>
      )}

      {/* Regeneration limit toast */}
      <RegenerationLimit
        open={toastMsg !== null}
        message={toastMsg ?? ""}
        onClose={() => setToastMsg(null)}
      />
    </div>
  )
}
