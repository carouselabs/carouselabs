"use client"

import { useEffect, useRef, useState } from "react"
import {
  Sparkles,
  Upload,
  Send,
  Download,
  Loader2,
  RotateCcw,
  FileText,
  Plus,
  X,
} from "lucide-react"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { LoadingGame } from "@/components/generate/LoadingGame"
import { useCreditStore } from "@/lib/store/creditStore"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import {
  ActionBar,
  BackLink,
  ChoiceHeader,
  CreateToolbar,
  captionFieldClasses,
} from "@/components/create/CreateKit"
import type { ThumbnailBlueprint } from "@/lib/types/thumbnail"

// ── Shared shapes (mirror the API routes) ──────────────────────────
interface HistoryTurn {
  role: "user" | "assistant"
  content: string
  images?: { base64: string; mediaType: string }[]
}

type ThumbnailQuestionInputType = "single_image" | "multiple_images" | "text" | "choice"

interface ThumbnailQuestion {
  topic: string
  inputType: ThumbnailQuestionInputType
  options: string[]
  maxImages: number | null
}

interface ThumbnailChatResponse {
  status: "asking" | "ready"
  message: string
  question: ThumbnailQuestion | null
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
  imagePreviews?: string[]
}

// A file the user has selected for a "multiple_images" question but hasn't
// confirmed yet — lets them remove/replace before submitting.
interface PendingImage {
  base64: string
  mediaType: string
  previewUrl: string
}

type Screen = "input" | "chat" | "review" | "result"
type VideoContentMode = "type" | "upload"

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

// Cycled while the final image generates — the single POST call has no real
// sub-stages to report, so this is a timed illusion of progress rather than
// a status derived from the request (mirrors the "this can take a while"
// treatment other generation flows in this app give a single long call).
const GENERATION_STATUS_MESSAGES = [
  "Analyzing your blueprint…",
  "Generating your thumbnail…",
  "Almost done…",
]

// Where the flow is, shown in the toolbar.
const THUMBNAIL_STEPS = ["Reference", "Questions", "Blueprint", "Thumbnail"]

const segmentClasses =
  "inline-flex h-8 items-center gap-1.5 rounded-control-sm px-3 text-label font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground aria-pressed:bg-surface-raised aria-pressed:text-foreground aria-pressed:shadow-card"

export function ThumbnailClient() {
  const [screen, setScreen] = useState<Screen>("input")

  // Screen 1
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceMediaType, setReferenceMediaType] = useState("image/jpeg")
  const [videoContent, setVideoContent] = useState("")
  const [contentMode, setContentMode] = useState<VideoContentMode>("type")
  const [extractingDocument, setExtractingDocument] = useState(false)
  const [documentName, setDocumentName] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

  // Screen 2 — chat
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<ThumbnailQuestion | null>(null)
  const [answerMode, setAnswerMode] = useState<"text" | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // True while an uploaded photo is being canvas-resized/re-encoded
  // (compressImage) — covers the gap between file-select and the moment the
  // preview/chat bubble actually appears.
  const [processingImage, setProcessingImage] = useState(false)

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
  const singleFileInputRef = useRef<HTMLInputElement>(null)
  const multiFileInputRef = useRef<HTMLInputElement>(null)
  const docFileInputRef = useRef<HTMLInputElement>(null)
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
    setContentMode("type")
    setExtractingDocument(false)
    setDocumentName(null)
    setDocumentError(null)
    setMessages([])
    setCurrentQuestion(null)
    setAnswerMode(null)
    setTextAnswer("")
    setPendingImages([])
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

  // Handles every answer type — plain text (choice/text questions) and one
  // or more images (single_image/multiple_images questions) alike.
  function submitAnswer(text: string, images?: UploadedAsset[]) {
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text,
        imagePreviews: images?.map((img) => `data:${img.mediaType};base64,${img.base64}`),
      },
    ])
    apiHistoryRef.current.push({
      role: "user",
      content: text,
      images: images?.map((img) => ({ base64: img.base64, mediaType: img.mediaType })),
    })
    if (images) {
      for (const img of images) {
        uploadedAssetsRef.current.push(img)
      }
    }
    setCurrentQuestion(null)
    setAnswerMode(null)
    setTextAnswer("")
    setPendingImages([])
    void callChat()
  }

  async function handleSingleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !file.type.startsWith("image/") || !currentQuestion) return
    setProcessingImage(true)
    try {
      const base64 = await compressImage(file)
      submitAnswer(`Uploaded a photo for: ${currentQuestion.topic}`, [
        { base64, mediaType: "image/jpeg", label: currentQuestion.topic },
      ])
    } catch {
      setError("Failed to process the uploaded image. Please try a different file.")
    } finally {
      setProcessingImage(false)
    }
  }

  async function handleMultiFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0 || !currentQuestion) return
    const maxImages = currentQuestion.maxImages ?? 1
    const remaining = Math.max(0, maxImages - pendingImages.length)
    const toAdd = files.slice(0, remaining).filter((f) => f.type.startsWith("image/"))
    if (toAdd.length === 0) return
    setProcessingImage(true)
    try {
      const compressed = await Promise.all(
        toAdd.map(async (file) => {
          const base64 = await compressImage(file)
          return { base64, mediaType: "image/jpeg", previewUrl: `data:image/jpeg;base64,${base64}` }
        }),
      )
      setPendingImages((prev) => [...prev, ...compressed])
    } catch {
      setError("Failed to process one or more images. Please try different files.")
    } finally {
      setProcessingImage(false)
    }
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
  }

  function confirmMultiImages() {
    if (pendingImages.length === 0 || !currentQuestion) return
    const count = pendingImages.length
    const images: UploadedAsset[] = pendingImages.map((img, i) => ({
      base64: img.base64,
      mediaType: img.mediaType,
      label: count > 1 ? `${currentQuestion.topic} — item ${i + 1} of ${count}` : currentQuestion.topic,
    }))
    submitAnswer(`Uploaded ${count} image${count > 1 ? "s" : ""} for: ${currentQuestion.topic}`, images)
  }

  function handleTextSubmit() {
    if (!textAnswer.trim()) return
    submitAnswer(textAnswer.trim())
  }

  async function handleDocumentSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setDocumentError(null)
    setExtractingDocument(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/thumbnail/extract-document", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to extract text")
      setVideoContent((data as { extractedText: string }).extractedText)
      setDocumentName(file.name)
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Failed to extract text from that file")
    } finally {
      setExtractingDocument(false)
    }
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

  // One toolbar for every screen: back to the Toolkit, and where you are.
  const stepIndex = screen === "input" ? 0 : screen === "chat" ? 1 : screen === "review" ? 2 : 3
  const toolbar = (
    <CreateToolbar
      back={<BackLink href="/toolkit">Toolkit</BackLink>}
      title="Thumbnail"
      steps={THUMBNAIL_STEPS}
      current={stepIndex}
    />
  )
  const referencePreview = referenceImage ? `data:${referenceMediaType};base64,${referenceImage}` : null
  const errorBox = error && (
    <div role="alert" className="rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
      {error}
    </div>
  )

  // ── Screen 1: Initial Input ──────────────────────────────────────
  if (screen === "input") {
    return (
      <div>
        {toolbar}
        <div className="mx-auto flex w-full max-w-showcase flex-col gap-8">
          <ChoiceHeader
            title={
              <span className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo */}
                <img src="/images/tools/thumbnail-recreation.svg" alt="" width={40} height={40} className="size-10 shrink-0 rounded-[10px] shadow-card" />
                Thumbnail
              </span>
            }
            description={
              <>
                Upload a reference thumbnail you like, tell us about your video, and we&apos;ll walk you
                through recreating its style for your own content.
              </>
            }
          />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
            {/* The reference is the canvas: everything else is recreated from it. */}
            <ReferenceUploader
              size="canvas"
              value={referenceImage}
              onChange={(b64, mediaType) => {
                setReferenceImage(b64)
                setReferenceMediaType(mediaType)
              }}
              onClear={() => setReferenceImage(null)}
            />

            <div className="flex flex-col gap-5 lg:border-l lg:border-border lg:pl-12">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="video-heading" className="text-body font-semibold text-foreground">
                    Tell us about your video
                  </h2>
                  <div role="group" aria-labelledby="video-heading" className="inline-flex rounded-control border border-border bg-surface p-1">
                    <button
                      type="button"
                      aria-pressed={contentMode === "type"}
                      onClick={() => setContentMode("type")}
                      className={segmentClasses}
                    >
                      Type
                    </button>
                    <button
                      type="button"
                      aria-pressed={contentMode === "upload"}
                      onClick={() => setContentMode("upload")}
                      className={segmentClasses}
                    >
                      <FileText className="size-3.5" aria-hidden />
                      Upload a file
                    </button>
                  </div>
                </div>

                {contentMode === "upload" && (
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={docFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                      onChange={(e) => void handleDocumentSelected(e)}
                    />
                    <button
                      type="button"
                      onClick={() => docFileInputRef.current?.click()}
                      disabled={extractingDocument}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-control border border-dashed border-control-border bg-surface-raised px-4 py-2 text-center text-label text-muted-foreground transition-colors duration-(--motion-fast) hover:border-brand/50 hover:bg-brand-soft/40 disabled:opacity-60"
                    >
                      {extractingDocument ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Upload className="size-4" strokeWidth={1.8} aria-hidden />
                      )}
                      {extractingDocument
                        ? "Extracting text…"
                        : documentName
                          ? `Replace "${documentName}"`
                          : "Upload a script or document (PDF, DOC, DOCX, TXT)"}
                    </button>
                    {documentError && <p className="text-caption text-danger">{documentError}</p>}
                    {documentName && !extractingDocument && !documentError && (
                      <p className="text-caption text-muted-foreground">
                        Extracted from {documentName} — review and edit below before continuing.
                      </p>
                    )}
                  </div>
                )}

                <textarea
                  value={videoContent}
                  onChange={(e) => setVideoContent(e.target.value)}
                  rows={9}
                  placeholder="Title, script, topic, or key points..."
                  aria-labelledby="video-heading"
                  className={captionFieldClasses}
                />
              </div>

              {errorBox}

              <Button
                variant="brand"
                size="lg"
                className="self-start"
                onClick={() => void handleAnalyzeStart()}
                disabled={!referenceImage || !videoContent.trim()}
              >
                <Sparkles aria-hidden />
                Analyze &amp; Start
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Screen 2: Conversational Q&A ─────────────────────────────────
  if (screen === "chat") {
    const maxImages = currentQuestion?.maxImages ?? 1
    const showTextInput = currentQuestion?.inputType === "text" || answerMode === "text"
    const showImagePicker =
      currentQuestion &&
      answerMode !== "text" &&
      (currentQuestion.inputType === "single_image" || currentQuestion.inputType === "multiple_images")

    return (
      <div>
        {toolbar}
        <h1 className="sr-only">Thumbnail</h1>
        <input
          ref={singleFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleSingleFileSelected(e)}
        />
        <input
          ref={multiFileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleMultiFilesSelected(e)}
        />

        <div className="mx-auto grid w-full max-w-showcase gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-4">
            <div role="log" aria-live="polite" className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex max-w-[85%] flex-col gap-1.5",
                    m.role === "user" ? "items-end self-end" : "items-start self-start"
                  )}
                >
                  {m.imagePreviews && m.imagePreviews.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {m.imagePreviews.map((src, idx) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={idx}
                          src={src}
                          alt="Uploaded"
                          className="size-16 rounded-control-sm border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-card px-4 py-3 text-label leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "rounded-br-md bg-brand text-brand-foreground"
                        : "rounded-bl-md border border-border bg-surface-raised text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div role="status" className="flex items-center gap-2 self-start rounded-card rounded-bl-md border border-border bg-surface-raised px-4 py-3">
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
                  <span className="text-caption text-muted-foreground">Thinking…</span>
                </div>
              )}

              {error && (
                <div role="alert" className="flex max-w-[85%] flex-col gap-2 self-start rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger">
                  {error}
                  <button
                    type="button"
                    onClick={() => void callChat()}
                    className="self-start rounded-detail text-caption font-medium underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Question input — floats at the bottom while the chat scrolls. The
                control shown adapts to question.inputType: choice buttons, a
                single-photo upload, a multi-photo picker (up to maxImages), or a
                text field. */}
            {currentQuestion && !isAnalyzing && (
              <div className="sticky bottom-0 z-(--z-sticky) flex flex-col gap-3 rounded-card border border-border bg-surface-raised/95 p-4 shadow-popover backdrop-blur-sm">
                <p className="text-caption font-medium text-muted-foreground">{currentQuestion.topic}</p>

                {currentQuestion.inputType === "choice" && answerMode !== "text" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => submitAnswer(opt)}
                        className="rounded-control border border-border bg-surface px-4 py-2.5 text-left text-label font-medium text-foreground transition-colors duration-(--motion-fast) hover:border-brand/60 hover:bg-brand-soft"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.inputType === "single_image" && answerMode !== "text" && (
                  <button
                    type="button"
                    onClick={() => singleFileInputRef.current?.click()}
                    disabled={processingImage}
                    className="flex h-12 items-center justify-center gap-2 rounded-control border border-dashed border-brand/40 bg-brand-soft/40 text-label font-medium text-brand transition-colors duration-(--motion-fast) hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processingImage ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
                    {processingImage ? "Processing photo…" : "Upload a photo"}
                  </button>
                )}

                {showImagePicker && currentQuestion.inputType === "multiple_images" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {pendingImages.map((img, i) => (
                        <div key={i} className="relative aspect-square overflow-hidden rounded-control-sm border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.previewUrl} alt={`Selected ${i + 1}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePendingImage(i)}
                            aria-label="Remove image"
                            className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors duration-(--motion-fast) hover:bg-foreground/90"
                          >
                            <X className="size-3" strokeWidth={2.5} aria-hidden />
                          </button>
                        </div>
                      ))}
                      {pendingImages.length < maxImages && (
                        <button
                          type="button"
                          onClick={() => multiFileInputRef.current?.click()}
                          disabled={processingImage}
                          aria-label="Upload a photo"
                          className="flex aspect-square items-center justify-center rounded-control-sm border border-dashed border-control-border text-muted-foreground transition-colors duration-(--motion-fast) hover:border-brand hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingImage ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="brand" size="sm" onClick={confirmMultiImages} disabled={pendingImages.length === 0}>
                        Use {pendingImages.length || ""} image{pendingImages.length === 1 ? "" : "s"}
                      </Button>
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {pendingImages.length} / {maxImages} selected
                      </span>
                    </div>
                  </div>
                )}

                {showImagePicker && (
                  <button
                    type="button"
                    onClick={() => setAnswerMode("text")}
                    className="self-start rounded-detail text-caption text-muted-foreground underline underline-offset-2 transition-colors duration-(--motion-fast) hover:text-foreground"
                  >
                    Answer in your own words instead
                  </button>
                )}

                {showTextInput && (
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
                      aria-label={currentQuestion.topic}
                      className={cn(controlClasses, "flex-1 resize-none px-3.5 py-2.5 leading-relaxed")}
                    />
                    <Button
                      variant="brand"
                      size="icon"
                      onClick={handleTextSubmit}
                      disabled={!textAnswer.trim()}
                      aria-label="Send"
                    >
                      <Send aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What the questions are about, kept in view */}
          <aside aria-label="Reference" className="hidden lg:block">
            <div className="sticky top-20 flex flex-col gap-3">
              {referencePreview && (
                <div className="aspect-video overflow-hidden rounded-card border border-border bg-surface-muted shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referencePreview} alt="Reference" className="h-full w-full object-contain" />
                </div>
              )}
              <p className="line-clamp-6 text-caption whitespace-pre-wrap text-muted-foreground">{videoContent}</p>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // ── Screen 3: Blueprint Review + Generate ────────────────────────
  if (screen === "review" && blueprint) {
    if (isGenerating) {
      return (
        <div>
          {toolbar}
          <h1 className="sr-only">Thumbnail</h1>
          <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-6">
            <div role="status" className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="size-8 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
              <p className="text-label font-medium text-foreground">{GENERATION_STATUS_MESSAGES[genStatusIndex]}</p>
              <p className="text-caption text-muted-foreground">(this can take up to a minute)</p>
            </div>
            <LoadingGame />
          </div>
        </div>
      )
    }

    return (
      <div>
        {toolbar}
        <div className="mx-auto grid w-full max-w-showcase gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          {referencePreview && (
            <div className="lg:sticky lg:top-20 lg:self-start">
              <div className="aspect-video overflow-hidden rounded-card border border-border bg-surface-muted shadow-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={referencePreview} alt="Reference" className="h-full w-full object-contain" />
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-8">
            <ChoiceHeader
              title="Your Thumbnail Blueprint"
              description={<>Here&apos;s the plan we&apos;ll generate from. Ready when you are.</>}
            />

            <BlueprintSheet title="Reference Structure (preserved)" rows={referenceCompositionRows(blueprint)} />
            <BlueprintSheet title="Your Content (fills the structure)" rows={adaptedContentRows(blueprint)} />

            {errorBox}

            <ActionBar>
              <Button variant="ghost" onClick={resetAll}>
                <RotateCcw aria-hidden />
                Start Over
              </Button>
              <Button variant="brand" onClick={() => void handleGenerate()}>
                <Sparkles aria-hidden />
                Generate Thumbnail — 15 credits
              </Button>
            </ActionBar>
          </div>
        </div>
      </div>
    )
  }

  // ── Screen 4: Result ──────────────────────────────────────────────
  if (screen === "result" && resultImageUrl) {
    return (
      <div>
        {toolbar}
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <h1 className="text-title-sm font-semibold text-foreground">Your Thumbnail</h1>

          <div className="aspect-video w-full overflow-hidden rounded-showcase border border-border bg-surface-muted shadow-dialog">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultImageUrl} alt="Generated thumbnail" className="h-full w-full object-cover" />
          </div>

          <ActionBar
            start={
              referencePreview && (
                <span className="flex items-center gap-2.5">
                  <span className="aspect-video w-20 shrink-0 overflow-hidden rounded-detail border border-border bg-surface-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referencePreview} alt="Reference" className="h-full w-full object-cover" />
                  </span>
                </span>
              )
            }
          >
            <Button variant="ghost" onClick={resetAll}>
              <RotateCcw aria-hidden />
              Start Over
            </Button>
            <Button onClick={() => void handleDownload()} disabled={downloading}>
              {downloading ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              {downloading ? "Downloading…" : "Download"}
            </Button>
          </ActionBar>
        </div>
      </div>
    )
  }

  return null
}

/** One half of the blueprint as a spec sheet: label on the left, value on the right. */
function BlueprintSheet({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="border-b border-foreground/80 pb-2.5 text-body font-semibold text-foreground">{title}</h2>
      <dl className="flex flex-col divide-y divide-border">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-caption font-medium text-muted-foreground">{label}</dt>
            <dd className="text-label text-foreground">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
