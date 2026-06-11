"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Copy, Check } from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { ImagePreview } from "@/components/generate/ImagePreview"
import { ImagePromptViewer } from "@/components/generate/ImagePromptViewer"

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

  // Step 4
  const [imagePrompt, setImagePrompt] = useState<string | null>(null)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    streamCaption()
    return () => abortRef.current?.abort()
  }, [])

  async function streamCaption() {
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
        body: JSON.stringify({ ideaId }),
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

  async function generateImagePrompt() {
    setIsGeneratingPrompt(true)
    setImagePrompt(null)
    setError(null)

    try {
      const res = await fetch("/api/generate/image-prompt", {
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

      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Generation failed")

      setImagePrompt(data.imagePrompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  async function generateImage() {
    if (!imagePrompt) return
    setIsGeneratingImage(true)
    setError(null)
    setImageUrl(null)
    setPostId(null)

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, imagePrompt, caption }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Image generation failed")

      setImageUrl(data.imageUrl)
      setPostId(data.postId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGeneratingImage(false)
    }
  }

  async function handleCopyCaption() {
    await navigator.clipboard.writeText(caption)
    setCaptionCopied(true)
    setTimeout(() => setCaptionCopied(false), 2000)
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
              <button
                onClick={streamCaption}
                disabled={isStreamingCaption}
                className="self-start px-3.5 py-2 rounded-lg bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.18)] border border-[rgba(124,58,237,0.2)] text-[12px] font-medium text-[#A78BFA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Regenerate caption
              </button>
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

            {/* Right: Image prompt + image */}
            <div className="flex flex-col gap-4">
              {/* Generated image sits above the prompt */}
              {imageUrl && !isGeneratingImage && (
                <ImagePreview src={imageUrl} alt="Generated LinkedIn image" />
              )}
              {isGeneratingImage && (
                <div
                  className={[
                    "rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] animate-pulse",
                    size === "1:1" ? "aspect-square" : "aspect-[4/5]",
                  ].join(" ")}
                />
              )}

              {/* Generate Image Prompt button — shown before prompt exists */}
              {!imagePrompt && !isGeneratingPrompt && (
                <button
                  onClick={generateImagePrompt}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.22)] transition-all"
                >
                  <Sparkles size={14} strokeWidth={2} />
                  Generate Image Prompt
                </button>
              )}

              {/* Prompt generating skeleton */}
              {isGeneratingPrompt && (
                <div className="flex flex-col gap-2.5 pt-1">
                  {SKELETON_WIDTHS.map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-[rgba(255,255,255,0.05)] animate-pulse"
                      style={{ width: w }}
                    />
                  ))}
                </div>
              )}

              {/* Prompt viewer */}
              {imagePrompt && !isGeneratingPrompt && (
                <div className="flex flex-col gap-3">
                  <ImagePromptViewer prompt={imagePrompt} />
                  <button
                    onClick={generateImagePrompt}
                    className="self-start px-3.5 py-2 rounded-lg bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.18)] border border-[rgba(124,58,237,0.2)] text-[12px] font-medium text-[#A78BFA] transition-colors"
                  >
                    Regenerate Prompt
                  </button>
                </div>
              )}

              {/* Generate Image with AI */}
              {imagePrompt && !isGeneratingPrompt && !isGeneratingImage && (
                <button
                  onClick={generateImage}
                  className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.14)] text-[13px] font-semibold text-[#C4B5FD] transition-colors"
                >
                  Generate Image with AI
                  <span className="text-[11px] font-normal text-[rgba(196,181,253,0.55)]">(optional)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
