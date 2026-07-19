"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Copy, Check, History, Download, RefreshCw, Loader2 } from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { InstructionBox } from "@/components/generate/InstructionBox"
import { VoiceGuidelinesToggle } from "@/components/generate/VoiceGuidelinesToggle"
import { ImagePreview } from "@/components/generate/ImagePreview"
import { PostToLinkedInButton } from "@/components/generate/PostToLinkedInButton"
import { LoadingGame } from "@/components/generate/LoadingGame"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"
import { friendlyGenerationError } from "@/lib/friendlyError"
import { countWords } from "@/lib/wordCount"
import { consumeCreditsClient, type CreditAction } from "@/lib/creditActions"

interface ImageClientProps {
  ideaId: string
  ideaHook: string
  hasGuidelines: boolean
}

type Step = 1 | 2 | 3 | 4
type ImageSize = "4:5" | "1:1"

const SKELETON_WIDTHS = ["88%", "72%", "95%", "65%", "80%", "55%", "70%", "40%"]

export function ImageClient({ ideaId, ideaHook, hasGuidelines }: ImageClientProps) {
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
  const [downloading, setDownloading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [restored, setRestored] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [captionInstruction, setCaptionInstruction] = useState("")
  // Opt-in flag: apply the user's saved voice guidelines on caption regeneration.
  const [useVoiceGuidelines, setUseVoiceGuidelines] = useState(false)
  // Custom instruction for the image generate/regenerate flow (step 4).
  const [imageInstruction, setImageInstruction] = useState("")
  // Shown when changing the reference image invalidates an already-generated
  // image (the old style is baked into its prompt).
  const [referenceNotice, setReferenceNotice] = useState<string | null>(null)
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

  // The reference image is baked into the image prompt at generation time, so
  // changing/removing it makes any already-generated image stale. Clear the
  // saved prompt + image and bounce the user out of step 4 so they regenerate
  // with the new style. No-op for an image that hasn't been generated yet.
  function invalidateGeneratedImage() {
    if (!imagePrompt && !imageUrl) return
    setImagePrompt(null)
    setImageUrl(null)
    setPostId(null)
    setSaved(false)
    setGameStarted(false)
    try {
      localStorage.removeItem(`imagePrompt_${ideaId}`)
      localStorage.removeItem(`imageUrl_${ideaId}`)
    } catch {
      // best-effort
    }
    setReferenceNotice(
      "Reference image changed — please regenerate your image to apply the new style.",
    )
    if (step === 4) setStep(3)
  }

  function handleReferenceChange(b64: string, mediaType: string) {
    setReferenceImage(b64)
    setReferenceMediaType(mediaType)
    invalidateGeneratedImage()
  }

  function handleReferenceClear() {
    setReferenceImage(null)
    invalidateGeneratedImage()
  }

  // Single-button flow: silently generate the image prompt, then immediately use
  // it to generate the image. Only the final image is shown. The prompt is still
  // kept in state + localStorage so Regenerate Image keeps working.
  async function generateImageFlow(userInstruction?: string) {
    setIsGeneratingImage(true)
    setGameStarted(true) // keep the game visible from now on
    setError(null)
    setReferenceNotice(null)
    setImageUrl(null)
    setPostId(null)

    try {
      // 1) Generate the image prompt silently (no UI update). When the user gave
      // an instruction AND a prompt already exists, send it as currentImagePrompt
      // so the API does a targeted edit instead of a full rewrite.
      const promptRes = await fetch("/api/generate/image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          caption,
          size,
          referenceImage: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
          userInstruction,
          currentImagePrompt: userInstruction ? imagePrompt ?? undefined : undefined,
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
        body: JSON.stringify({
          ideaId,
          imagePrompt: newPrompt,
          caption,
          size,
          referenceImage: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
        }),
      })
      const imgData = await imgRes.json()
      if (!imgRes.ok) {
        throw new Error((imgData as { error?: string }).error ?? "Image generation failed")
      }
      setImageUrl(imgData.imageUrl)
      setPostId(imgData.postId)
      setImageInstruction("") // clear the instruction box on success
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

  // Charge the weighted credit cost before a chargeable generation. Returns
  // false (and shows a toast) when the balance can't cover it — callers must
  // block the generation in that case.
  async function chargeCredits(action: CreditAction): Promise<boolean> {
    const res = await consumeCreditsClient(action)
    if (!res.ok) {
      setToastMsg(
        res.requiresUpgrade
          ? "You're out of credits — upgrade to Pro to continue"
          : "You're out of credits — top up extra credits in Billing",
      )
      setTimeout(() => setToastMsg(null), 5000)
    }
    return res.ok
  }

  // First generation in the Image + Caption flow — charges the post cost
  // (breakdown + caption + image included), then streams the caption.
  async function handleFirstGenerate() {
    if (!(await chargeCredits("image_caption"))) return
    await streamCaption()
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
    // Text regenerations cost 1 credit on top of the post cost.
    if (!(await chargeCredits("text_regen"))) return
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
        body: JSON.stringify({
          ideaId,
          imagePrompt,
          caption,
          size,
          referenceImage: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
        }),
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
    // Image regenerations cost 8 credits on top of the post cost.
    if (!(await chargeCredits("image_regen"))) return
    // Reserve the slot synchronously BEFORE generating so rapid clicks can't
    // read a stale count and slip past the limit.
    increment(ideaId)
    try {
      // With a custom instruction, re-run the full flow so the prompt is edited
      // first; without one, just re-render the image from the existing prompt.
      const userInstruction = imageInstruction.trim() || undefined
      if (userInstruction) {
        await generateImageFlow(userInstruction)
      } else {
        await generateImage()
      }
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
          {postId && (
            <button
              onClick={handleSaveDraft}
              className="px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] hover:bg-[#E9E7E1] text-[12px] font-medium text-[#6B7280] transition-colors"
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
            {/* Custom instruction — only after a successful generation. Typing
                here + clicking "Regenerate Image" applies the change. */}
            <InstructionBox value={imageInstruction} onChange={setImageInstruction} />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadImage}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[rgba(26,26,26,0.3)] bg-[rgba(26,26,26,0.08)] hover:bg-[rgba(26,26,26,0.14)] text-[12px] font-medium text-[#1A1A1A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} strokeWidth={2.2} />
                Regenerate Image — 8 credits
              </button>
              <PostToLinkedInButton
                caption={caption}
                imageUrls={imageUrl ? [imageUrl] : []}
                disabled={!imageUrl}
              />
            </div>
          </div>
        )}

        {isGeneratingImage && (
          <div
            className={[
              "flex flex-col items-center justify-center gap-4 rounded-2xl bg-[rgba(26,26,26,0.04)] border border-[rgba(26,26,26,0.12)]",
              size === "1:1" ? "aspect-square" : "aspect-[4/5]",
            ].join(" ")}
          >
            <div className="h-10 w-10 rounded-full border-2 border-[rgba(26,26,26,0.25)] border-t-[#1A1A1A] animate-spin" />
            <p className="text-[13px] font-medium text-[#1A1A1A]">
              Generating your image…
            </p>
            <p className="text-[11px] text-[#9CA3AF]">(this can take up to a minute)</p>
          </div>
        )}

        {/* Single button — generates the prompt then the image in one go. No
            instruction box before generation; it appears only after success. */}
        {!imageUrl && !isGeneratingImage && (
          <button
            onClick={() => void generateImageFlow().catch(() => {})}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
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
                onClick={() => void handleFirstGenerate()}
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
                  Regenerate caption — 1 credit
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
            Continue to Image →
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
                <span className="text-[12px] text-[#9CA3AF]">Instagram, LinkedIn, Facebook</span>
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
                <span className="text-[12px] text-[#9CA3AF]">Instagram, Twitter/X, Facebook</span>
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
              We&apos;ll match the style — not copy the image
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
                onClick={() => void generateImageFlow().catch(() => {})}
                disabled={isGeneratingImage}
                className="self-start text-[13px] font-medium text-[#1A1A1A] hover:text-black transition-colors disabled:opacity-50"
              >
                Try Again
              </button>
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
