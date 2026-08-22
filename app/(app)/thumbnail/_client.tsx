"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Upload, Send, Download, Loader2, RotateCcw, ImageIcon } from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { LoadingGame } from "@/components/generate/LoadingGame"
import { useCreditStore } from "@/lib/store/creditStore"
import type { ThumbnailBlueprint } from "@/lib/types/thumbnail"

// ── Shared shapes (mirror the API routes) ──────────────────────────
interface HistoryTurn {
  role: "user" | "assistant"
  content: string
  imageBase64?: string
  imageMediaType?: string
}

interface ThumbnailChatResponse {
  status: "asking" | "ready"
  message: string
  question: { topic: string; options: string[] } | null
  blueprint: ThumbnailBlueprint | null
}

interface UploadedAsset {
  base64: string
  mediaType: string
  label: string
}

interface DisplayMessage {
  role: "user" | "assistant"
  text: string
  imagePreview?: string
}

type Screen = "input" | "chat" | "review" | "result"

// Blueprint review rows, grouped to mirror the two-part schema: a precise
// structural read of the reference (never touched by user content) and the
// user-specific content that fills that fixed structure.
function referenceCompositionRows(blueprint: ThumbnailBlueprint): { label: string; value: string }[] {
  const rc = blueprint.referenceComposition
  const rows = [
    { label: "Subject Count", value: String(rc.subjectCount) },
    { label: "Subject Position", value: rc.subjectPosition },
    { label: "Subject Scale", value: rc.subjectScale },
    { label: "Background", value: rc.background },
    { label: "Main Text", value: `${rc.mainText.position}, ${rc.mainText.size}, ${rc.mainText.color}` },
  ]
  if (rc.secondaryText) {
    rows.push({
      label: "Secondary Text Region",
      value: `${rc.secondaryText.position ?? "—"}, ${rc.secondaryText.size ?? "—"}, ${rc.secondaryText.color ?? "—"}`,
    })
  }
  rows.push(
    { label: "Additional Objects", value: rc.additionalObjects },
    { label: "Composition Rule", value: rc.compositionRule },
  )
  return rows
}

function adaptedContentRows(blueprint: ThumbnailBlueprint): { label: string; value: string }[] {
  const ac = blueprint.adaptedContent
  const rows = [
    { label: "Main Subject", value: ac.mainSubjectDescription },
    { label: "Main Headline Text", value: ac.mainHeadlineText },
  ]
  if (ac.secondaryText) rows.push({ label: "Secondary Text", value: ac.secondaryText })
  rows.push({ label: "Emotion", value: ac.emotion })
  if (blueprint.additionalGuidance) {
    rows.push({ label: "Additional Guidance", value: blueprint.additionalGuidance })
  }
  return rows
}

// Downscale + re-encode to JPEG before sending, same treatment as
// ReferenceUploader — mid-chat asset photos don't need full resolution either.
async function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)
        const base64 = canvas.toDataURL("image/jpeg", quality)
        resolve(base64.split(",")[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function optionKind(option: string): "upload" | "text" | "decide" {
  const lower = option.toLowerCase()
  if (lower.includes("upload")) return "upload"
  if (lower.includes("tell me") || lower.includes("provide")) return "text"
  return "decide"
}

// Cycled while the final image generates — the single POST call has no real
// sub-stages to report, so this is a timed illusion of progress rather than
// a status derived from the request (mirrors the "this can take a while"
// treatment other generation flows in this app give a single long call).
const GENERATION_STATUS_MESSAGES = [
  "Analyzing your blueprint…",
  "Generating your thumbnail…",
  "Almost done…",
]

export function ThumbnailClient() {
  const [screen, setScreen] = useState<Screen>("input")

  // Screen 1
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceMediaType, setReferenceMediaType] = useState("image/jpeg")
  const [videoContent, setVideoContent] = useState("")

  // Screen 2 — chat
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<{ topic: string; options: string[] } | null>(
    null,
  )
  const [answerMode, setAnswerMode] = useState<"text" | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Screen 3
  const [blueprint, setBlueprint] = useState<ThumbnailBlueprint | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genStatusIndex, setGenStatusIndex] = useState(0)

  // Screen 4
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const apiHistoryRef = useRef<HistoryTurn[]>([])
  const uploadedAssetsRef = useRef<UploadedAsset[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentQuestion, isAnalyzing])

  // Cycle the generation status message every few seconds while a
  // generation is in flight (handleGenerate resets the index to 0 when it
  // starts, so each run begins on the first message).
  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => {
      setGenStatusIndex((i) => (i + 1) % GENERATION_STATUS_MESSAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isGenerating])

  function resetAll() {
    setScreen("input")
    setReferenceImage(null)
    setReferenceMediaType("image/jpeg")
    setVideoContent("")
    setMessages([])
    setCurrentQuestion(null)
    setAnswerMode(null)
    setTextAnswer("")
    setIsAnalyzing(false)
    setBlueprint(null)
    setIsGenerating(false)
    setResultImageUrl(null)
    setError(null)
    apiHistoryRef.current = []
    uploadedAssetsRef.current = []
  }

  async function callChat() {
    if (!referenceImage) return
    setIsAnalyzing(true)
    setError(null)
    try {
      const res = await fetch("/api/thumbnail/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory: apiHistoryRef.current,
          referenceImageBase64: referenceImage,
          referenceImageMediaType: referenceMediaType,
          videoContent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong")

      const response = data as ThumbnailChatResponse
      apiHistoryRef.current.push({ role: "assistant", content: JSON.stringify(response) })
      setMessages((prev) => [...prev, { role: "assistant", text: response.message }])

      if (response.status === "ready" && response.blueprint) {
        setBlueprint(response.blueprint)
        setCurrentQuestion(null)
        setScreen("review")
      } else {
        setCurrentQuestion(response.question)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleAnalyzeStart() {
    if (!referenceImage || !videoContent.trim()) return
    apiHistoryRef.current = []
    uploadedAssetsRef.current = []
    setMessages([])
    setCurrentQuestion(null)
    setBlueprint(null)
    setError(null)
    setScreen("chat")
    await callChat()
  }

  function submitAnswer(text: string, imageBase64?: string, imageMediaType?: string) {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
        imagePreview: imageBase64 ? `data:${imageMediaType};base64,${imageBase64}` : undefined,
      },
    ])
    apiHistoryRef.current.push({ role: "user", content: text, imageBase64, imageMediaType })
    if (imageBase64 && imageMediaType) {
      uploadedAssetsRef.current.push({
        base64: imageBase64,
        mediaType: imageMediaType,
        label: currentQuestion?.topic ?? "Uploaded asset",
      })
    }
    setCurrentQuestion(null)
    setAnswerMode(null)
    setTextAnswer("")
    void callChat()
  }

  function handleOptionClick(option: string) {
    const kind = optionKind(option)
    if (kind === "upload") {
      fileInputRef.current?.click()
    } else if (kind === "text") {
      setAnswerMode("text")
    } else {
      submitAnswer(option)
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !file.type.startsWith("image/")) return
    try {
      const base64 = await compressImage(file)
      submitAnswer(`Uploaded a photo for: ${currentQuestion?.topic ?? "this"}`, base64, "image/jpeg")
    } catch {
      setError("Failed to process the uploaded image. Please try a different file.")
    }
  }

  function handleTextSubmit() {
    if (!textAnswer.trim()) return
    submitAnswer(textAnswer.trim())
  }

  async function handleGenerate() {
    if (!blueprint || !referenceImage) return
    setGenStatusIndex(0)
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/thumbnail/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint,
          referenceImageBase64: referenceImage,
          referenceImageMediaType: referenceMediaType,
          uploadedAssets: uploadedAssetsRef.current,
          videoContent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Generation failed")
      setResultImageUrl(data.imageUrl)
      setScreen("result")
      void useCreditStore.getState().refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownload() {
    if (!resultImageUrl) return
    setDownloading(true)
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(resultImageUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `thumbnail-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(resultImageUrl, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  // ── Screen 1: Initial Input ──────────────────────────────────────
  if (screen === "input") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[rgba(124,58,237,0.1)] flex items-center justify-center">
              <ImageIcon size={16} className="text-[#7C3AED]" strokeWidth={2} />
            </div>
            <h1 className="text-[22px] font-bold text-[#0A0A0A]">Thumbnail</h1>
          </div>
          <p className="text-[13px] text-[#6B7280] leading-[1.55]">
            Upload a reference thumbnail you like, tell us about your video, and we&apos;ll walk you
            through recreating its style for your own content.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <ReferenceUploader
            value={referenceImage}
            onChange={(b64, mediaType) => {
              setReferenceImage(b64)
              setReferenceMediaType(mediaType)
            }}
            onClear={() => setReferenceImage(null)}
          />

          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
              Tell us about your video
            </p>
            <textarea
              value={videoContent}
              onChange={(e) => setVideoContent(e.target.value)}
              rows={6}
              placeholder="Title, script, topic, or key points..."
              className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.6] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
              {error}
            </div>
          )}

          <button
            onClick={() => void handleAnalyzeStart()}
            disabled={!referenceImage || !videoContent.trim()}
            className={[
              "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
              referenceImage && videoContent.trim()
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.28)]"
                : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
            ].join(" ")}
          >
            <Sparkles size={14} strokeWidth={2} />
            Analyze &amp; Start
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 2: Conversational Q&A ─────────────────────────────────
  if (screen === "chat") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col h-full gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFileSelected(e)}
        />

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 py-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1.5 max-w-[85%] ${m.role === "user" ? "self-end items-end" : "self-start items-start"}`}
            >
              {m.imagePreview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.imagePreview}
                  alt="Uploaded"
                  className="w-20 h-20 rounded-lg object-cover border border-[#E5E3DE]"
                />
              )}
              <div
                className={[
                  "px-4 py-3 rounded-2xl text-[13px] leading-[1.55] whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-[#7C3AED] text-white rounded-br-md"
                    : "bg-white border border-[#E5E3DE] text-[#374151] rounded-bl-md",
                ].join(" ")}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isAnalyzing && (
            <div className="self-start flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-[#E5E3DE]">
              <Loader2 size={13} className="animate-spin text-[#9CA3AF]" />
              <span className="text-[12px] text-[#9CA3AF]">Thinking…</span>
            </div>
          )}

          {error && (
            <div className="self-start flex flex-col gap-2 px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)] max-w-[85%]">
              {error}
              <button
                onClick={() => void callChat()}
                className="self-start text-[12px] font-medium underline"
              >
                Try again
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Question options / answer input — sticky at the bottom.
            An empty options array is the model's signal to skip buttons
            entirely and let the user type straight into a text field (e.g.
            entering custom thumbnail text, or an open-ended guidance note). */}
        {currentQuestion && !isAnalyzing && (
          <div className="flex-shrink-0 flex flex-col gap-2.5 pt-2 border-t border-[#E5E3DE]">
            <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
              {currentQuestion.topic}
            </p>

            {currentQuestion.options.length > 0 && answerMode !== "text" && (
              <div className="flex flex-col gap-2">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleOptionClick(opt)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E3DE] bg-white hover:border-[#7C3AED] hover:bg-[rgba(124,58,237,0.05)] text-[13px] font-medium text-[#374151] text-left transition-all"
                  >
                    {optionKind(opt) === "upload" && <Upload size={13} className="text-[#7C3AED]" />}
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {(currentQuestion.options.length === 0 || answerMode === "text") && (
              <div className="flex items-end gap-2">
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleTextSubmit()
                    }
                  }}
                  autoFocus
                  rows={2}
                  placeholder="Type your answer..."
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.5] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textAnswer.trim()}
                  className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <Send size={14} className="text-white" strokeWidth={2.2} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Screen 3: Blueprint Review + Generate ────────────────────────
  if (screen === "review" && blueprint) {
    if (isGenerating) {
      return (
        <div className="max-w-md mx-auto flex flex-col gap-6 items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full border-2 border-[rgba(124,58,237,0.25)] border-t-[#7C3AED] animate-spin" />
            <p className="text-[13px] font-medium text-[#1A1A1A]">
              {GENERATION_STATUS_MESSAGES[genStatusIndex]}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">(this can take up to a minute)</p>
          </div>
          <LoadingGame />
        </div>
      )
    }

    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[22px] font-bold text-[#0A0A0A]">Your Thumbnail Blueprint</h1>
          <p className="text-[13px] text-[#6B7280] leading-[1.55]">
            Here&apos;s the plan we&apos;ll generate from. Ready when you are.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-[#E5E3DE]">
            <p className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-widest">
              Reference Structure (preserved)
            </p>
            {referenceCompositionRows(blueprint).map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-[13px] text-[#374151] leading-[1.5]">{value || "—"}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-[#E5E3DE]">
            <p className="text-[11px] font-semibold text-[#7C3AED] uppercase tracking-widest">
              Your Content (fills the structure)
            </p>
            {adaptedContentRows(blueprint).map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-[13px] text-[#374151] leading-[1.5]">{value || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] shadow-[0_0_24px_rgba(124,58,237,0.28)] transition-all"
          >
            <Sparkles size={14} strokeWidth={2} />
            Generate Thumbnail — 15 credits
          </button>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors"
          >
            <RotateCcw size={12} />
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // ── Screen 4: Result ──────────────────────────────────────────────
  if (screen === "result" && resultImageUrl) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center">
        <div className="w-full flex flex-col gap-1.5">
          <h1 className="text-[22px] font-bold text-[#0A0A0A]">Your Thumbnail</h1>
        </div>

        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-[#E5E3DE] bg-[#F4F2EC]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultImageUrl} alt="Generated thumbnail" className="w-full h-full object-cover" />
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin" strokeWidth={2.2} />
            ) : (
              <Download size={13} strokeWidth={2.2} />
            )}
            {downloading ? "Downloading…" : "Download"}
          </button>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E3DE] bg-white hover:bg-[#F4F2EC] text-[12px] font-medium text-[#6B7280] transition-colors"
          >
            <RotateCcw size={12} />
            Start Over
          </button>
        </div>
      </div>
    )
  }

  return null
}
