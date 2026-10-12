"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, Copy, Check, Download, RefreshCw, Loader2, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import {
  ActionBar,
  BackButton,
  BackLink,
  CaptionSkeleton,
  CategoryChips,
  ChoiceCard,
  ChoiceHeader,
  CreateToolbar,
  ErrorNotice,
  FieldLabel,
  LoadingState,
  PlatformChecks,
  PlatformTag,
  RatioCard,
  RestoredTag,
  StepActions,
  StepColumn,
  StructureTag,
  Workspace,
  captionFieldClasses,
} from "@/components/create/CreateKit"
import { CaptionSetup } from "@/components/create/CaptionSetup"
import { ReferenceUploader } from "@/components/generate/ReferenceUploader"
import { InstructionBox } from "@/components/generate/InstructionBox"
import { VoiceGuidelinesToggle } from "@/components/generate/VoiceGuidelinesToggle"
import { ImagePreview } from "@/components/generate/ImagePreview"
import { PostToLinkedInButton } from "@/components/generate/PostToLinkedInButton"
import { ScheduleForLaterButton } from "@/components/generate/ScheduleForLaterButton"
import { LoadingGame } from "@/components/generate/LoadingGame"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"
import { friendlyGenerationError } from "@/lib/friendlyError"
import { countWords } from "@/lib/wordCount"
import { createDraftWriter } from "@/lib/postDraft"
import { persistDraftValues, reconcileDraft } from "@/lib/draftRecovery"
import { DraftRecoveryNotice } from "@/components/generate/DraftRecoveryNotice"
import { useCreditStore } from "@/lib/store/creditStore"
import { isValidPlatform, validatePostForPlatform } from "@/lib/platforms"
import { CAPTION_TEMPLATES, CATEGORY_ORDER } from "@/lib/captionTemplates"
import { IMAGE_CATEGORY_ORDER, getImageTemplatesByCategory } from "@/lib/imageStructureTemplates"

type BrowserDraft = { caption: string | null; prompt: string | null; imageUrl: string | null; size: ImageSize | null }

interface ImageClientProps {
  ideaId: string
  ideaHook: string
  hasGuidelines: boolean
  isOwnIdea: boolean
}

type Step = 1 | 2 | 3 | 4
type ImageSize = "4:5" | "1:1"

// Pre-generation selection flow — own-idea posts only. Trending ideas start
// (and stay) on "generating", i.e. the unchanged existing flow.
type ImageFlowStep =
  | "platform-select"
  | "structure-select"
  | "custom-input"
  | "template-select"
  | "generating"
type StructureMode = "auto" | "custom" | "template"

// Image structure selection — appears after reference image upload/size
// selection, right before the actual image generation call. Shown for
// every idea.
type ImageStructureStep = "select" | "custom" | "template" | "ready"
type ImageStructureMode = "auto" | "custom" | "template" | "reference-only"

export function ImageClient({ ideaId, ideaHook, hasGuidelines, isOwnIdea }: ImageClientProps) {
  const [step, setStep] = useState<Step>(1)

  // Platform + structure selection — now shown for every idea (trending and
  // own-idea alike). Selections feed the /api/generate/caption request.
  const [imageFlowStep, setImageFlowStep] = useState<ImageFlowStep>("platform-select")
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [structureMode, setStructureMode] = useState<StructureMode | null>(null)
  const [customStructure, setCustomStructure] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_ORDER[0])

  // Image structure selection — now shown for every idea, gating the
  // "Generate Image" button on step 4 until a visual structure is chosen.
  const [imageStructureStep, setImageStructureStep] = useState<ImageStructureStep>("select")
  const [imageStructureMode, setImageStructureMode] = useState<ImageStructureMode | null>(null)
  const [customImageStructure, setCustomImageStructure] = useState("")
  const [selectedImageTemplateId, setSelectedImageTemplateId] = useState<string | null>(null)
  const [selectedImageCategory, setSelectedImageCategory] = useState(IMAGE_CATEGORY_ORDER[0])

  // The idea's deep dive content, fetched once on mount for every idea —
  // needed by Stage 1 (presentation structure) since this client only
  // otherwise holds the hook, not the full breakdown.
  const [deepDive, setDeepDive] = useState("")

  // Which of the 3 pipeline stages is running, so the loading UI can show
  // real progress instead of one generic spinner.
  const [imageGenStage, setImageGenStage] = useState<
    "structure" | "prompt" | "image" | null
  >(null)

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
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [restored, setRestored] = useState(false)
  // True until init()'s session-restore check resolves — avoids flashing the
  // platform-select screen before a restored session flips imageFlowStep
  // away from its "platform-select" default.
  const [initializing, setInitializing] = useState(true)
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
  const [writer] = useState(() => createDraftWriter(ideaId, fetch, `imageDraft_${ideaId}`))
  const restoreChecked = useRef(false)
  const [browserRecovery, setBrowserRecovery] = useState<BrowserDraft | null>(null)
  // Guards against rapid double-clicks firing two simultaneous generations
  // (each of which would be charged server-side).
  const isChargingRef = useRef(false)

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

    // Stage 1 (presentation structure) needs the full deep dive, which this
    // client doesn't otherwise hold — fetched for every idea now. The
    // breakdown is guaranteed to exist (the server page redirects otherwise),
    // so this is just a cached DB read.
    try {
      const res = await fetch(`/api/ideas/${ideaId}/breakdown`, { signal: AbortSignal.timeout(15_000) })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.breakdown?.deepDive === "string") setDeepDive(data.breakdown.deepDive)
      }
    } catch {
      // best-effort — Stage 1 will still run with an empty deep dive
    }

    // Always restore the server record, including its identity and revision.
    // Local unsaved text takes precedence, while server assets recover another device.
    try {
      const res = await fetch(`/api/posts?ideaId=${encodeURIComponent(ideaId)}&format=SINGLE_IMAGE`, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error("Saved posts could not be checked. Your local draft is still available; reload before scheduling.")
      const { post } = await res.json()
      restoreChecked.current = true
      if (post) {
        setPostId(post.id)
        writer.restore({ postId: post.id, caption: post.caption ?? "", updatedAt: post.updatedAt })
        const local: BrowserDraft | null = savedCaption !== null || savedPrompt || savedImageUrl || savedSize
          ? { caption: savedCaption, prompt: savedPrompt, imageUrl: savedImageUrl, size: savedSize } : null
        const remote: BrowserDraft = { caption: post.caption ?? "", prompt: post.metadata?.imagePrompt ?? null, imageUrl: post.imageUrls?.[0] ?? null, size: post.metadata?.size === "1:1" ? "1:1" : "4:5" }
        const selected = reconcileDraft(`imageDraft_${ideaId}`, local, remote, post.updatedAt)
        savedCaption = selected.draft.caption
        savedPrompt = selected.draft.prompt
        savedImageUrl = selected.draft.imageUrl
        savedSize = selected.draft.size
        setBrowserRecovery(selected.recovery)
        persistBrowserDraft(selected.draft, post.updatedAt)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore the saved post. Reload before scheduling.")
    }

    if (savedSize) setSize(savedSize)
    if (savedCaption) {
      setCaption(savedCaption)
      setCaptionReady(true)
    }
    if (savedPrompt) setImagePrompt(savedPrompt)
    if (savedImageUrl) setImageUrl(savedImageUrl)

    const hasAnySaved = !!(savedCaption || savedPrompt || savedImageUrl || savedSize)
    if (hasAnySaved) {
      setRestored(true)
      // A previous session already exists — skip the platform/caption
      // structure selection and drop straight into the saved state.
      setImageFlowStep("generating")
    }
    // Image structure selection (Stage 1) is a separate choice from the
    // caption structure above — only skip it if an image was actually
    // generated already. A caption/prompt/size-only restore means the user
    // hasn't reached Stage 1 yet, so it must still show (and if it were
    // skipped here, generateImageForOwnIdea() would be called with a null
    // imageStructureMode and Stage 1 would reject the request).
    if (savedImageUrl) {
      setImageStructureStep("ready")
    }

    // Jump to the furthest step the saved data supports.
    if (savedImageUrl || savedPrompt) setStep(4)
    else if (savedCaption) setStep(2)
    else setStep(1)

    // No auto-generation on mount. A brand-new idea lands on step 1 with the
    // voice-guidelines toggle + a "Generate Caption" button, so the user can set
    // their preference before the first caption is generated.
    setInitializing(false)
  }

  async function streamCaption(userInstruction?: string, currentCaption?: string, isRegen = false) {
    if (isChargingRef.current) return
    isChargingRef.current = true
    setIsStreamingCaption(true)
    const previousCaption = caption
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
        body: JSON.stringify({
          ideaId,
          userInstruction,
          currentCaption,
          useVoiceGuidelines,
          // Server-side charging flags: first generation charges the whole
          // Image + Caption post (15); regens carry the caption as evidence.
          flow: "image_caption",
          isRegen,
          // Platform + structure selection — sent for every idea now, which
          // switches the API to the V2 master prompt (restored sessions that
          // skipped selection send undefined here, and the API falls back to
          // its legacy prompt for them).
          platform: selectedPlatform ?? undefined,
          structureMode: structureMode ?? undefined,
          templateStructure:
            structureMode === "template"
              ? CAPTION_TEMPLATES.find((t) => t.id === selectedTemplateId)?.structure
              : undefined,
          customStructure: structureMode === "custom" ? customStructure : undefined,
        }),
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
      // Credits were charged server-side — refresh the Topbar balance.
      void useCreditStore.getState().refresh()
    } catch (err) {
      setCaption(previousCaption)
      setCaptionReady(Boolean(previousCaption))
      if ((err as Error).name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      isChargingRef.current = false
      setIsStreamingCaption(false)
    }
  }

  // ── localStorage persistence helpers (keyed per ideaId) ──
  function persistBrowserDraft(draft: BrowserDraft, revision = writer.revision(), clearRecovery = false) {
    try {
      persistDraftValues(`imageDraft_${ideaId}`, {
        [`imageCaption_${ideaId}`]: draft.caption, [`imagePrompt_${ideaId}`]: draft.prompt,
        [`imageUrl_${ideaId}`]: draft.imageUrl, [`imageSize_${ideaId}`]: draft.size,
      }, revision, clearRecovery)
    } catch { setError("Browser draft recovery is unavailable. Save Draft before leaving this page.") }
  }

  function persistCaption(value: string) {
    try {
      localStorage.setItem(`imageCaption_${ideaId}`, value)
    } catch {
      setError("Browser draft recovery is unavailable. Save Draft before leaving this page.")
    }
  }

  // Caption edits are persisted too, so navigating back restores the latest text.
  function handleCaptionChange(value: string) {
    setSaved(false)
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

  // LEGACY — pre-3-stage-pipeline single-stage flow, kept as backup, currently
  // unused. Every idea now goes through generateImageForOwnIdea() below
  // instead. Left defined (not deleted) in case we need to revert.
  async function generateImageFlow(userInstruction?: string, isRegen = false) {
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
          // Own-idea flow only: image structure selection. Not wired into the
          // prompt yet — the API route ignores these until that lands.
          ...(isOwnIdea
            ? {
                imageStructureMode: imageStructureMode ?? undefined,
                customImageStructure:
                  imageStructureMode === "custom" ? customImageStructure : undefined,
                imageTemplateId:
                  imageStructureMode === "template" ? selectedImageTemplateId : undefined,
              }
            : {}),
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
          isRegen, // server charges image_regen (8) for regenerations
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
      // Credits were charged server-side — refresh the Topbar balance.
      void useCreditStore.getState().refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let handleRegenerateImage refund the reserved slot on failure
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // 3-stage pipeline, now used for every idea (trending and own-idea alike):
  // Stage 1 decides the presentation structure, Stage 2 turns that + the post
  // content into a detailed image prompt, Stage 3 renders it. The name is a
  // holdover from when this only ran for own-idea posts.
  async function generateImageForOwnIdea(userInstruction?: string, isRegen = false) {
    setIsGeneratingImage(true)
    setGameStarted(true) // keep the game visible from now on
    setError(null)
    setReferenceNotice(null)
    setImageUrl(null)
    setPostId(null)

    try {
      // 1) Presentation structure decision.
      setImageGenStage("structure")
      const structureRes = await fetch("/api/own-idea/presentation-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ideaHook,
          deepDive,
          caption,
          imageStructureMode,
          customImageStructure: imageStructureMode === "custom" ? customImageStructure : undefined,
          imageTemplateId: imageStructureMode === "template" ? selectedImageTemplateId : undefined,
          referenceImageBase64: referenceImage ?? undefined,
          referenceMediaType: referenceImage ? referenceMediaType : undefined,
        }),
      })
      const structureData = await structureRes.json()
      if (!structureRes.ok) {
        throw new Error(
          (structureData as { error?: string }).error ?? "Failed to determine image structure",
        )
      }
      const presentationStructure = structureData.presentationStructure as string

      // 2) Image prompt generation, grounded in the structure decision above.
      setImageGenStage("prompt")
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
          isOwnIdea: true,
          presentationStructure,
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

      // 3) Render the image — identical to the trending-idea flow.
      setImageGenStage("image")
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
          isRegen, // server charges image_regen (8) for regenerations
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
      // Credits were charged server-side — refresh the Topbar balance.
      void useCreditStore.getState().refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let handleRegenerateImage refund the reserved slot on failure
    } finally {
      setIsGeneratingImage(false)
      setImageGenStage(null)
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
    // Capture the instruction + current caption, then clear the input. The
    // current caption is always sent on regens: it lets the API do a targeted
    // edit when an instruction is present AND serves as the server-side
    // evidence that this is a 1-credit regeneration.
    const userInstruction = captionInstruction.trim() || undefined
    const currentCaption = caption || undefined
    setCaptionInstruction("")
    increment(ideaId)
    try {
      await streamCaption(userInstruction, currentCaption, true)
      const newCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
      if (newCount >= MAX_REGENERATIONS) {
        setToastMsg("You've used both regenerations for this session")
        setTimeout(() => setToastMsg(null), 5000)
      }
    } catch {
      decrement(ideaId)
    }
  }

  // LEGACY — re-renders the image from an already-generated prompt without
  // re-running Stage 1/2. Kept as backup, currently unused (regeneration now
  // always goes through generateImageForOwnIdea()'s full 3-stage pipeline).
  async function generateImage(isRegen = false) {
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
          isRegen, // server charges image_regen (8) for regenerations
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
      // Credits were charged server-side — refresh the Topbar balance.
      void useCreditStore.getState().refresh()
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
      // Every idea now re-runs the full 3-stage pipeline on regeneration too —
      // Stage 1 (presentation structure) has no lightweight edit mode of its
      // own. Flags isRegen so the server charges image_regen (8).
      const userInstruction = imageInstruction.trim() || undefined
      await generateImageForOwnIdea(userInstruction, true)
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
    try {
      await navigator.clipboard.writeText(caption)
      setCaptionCopied(true)
      setTimeout(() => setCaptionCopied(false), 2000)
    } catch {
      setError("Could not copy. Select the caption and copy it manually.")
    }
  }

  // Route through the same-origin proxy so R2's CORS policy can't block the
  // fetch, then download the bytes as carouselabs-image-[ideaId].png. If the
  // proxy fetch fails, fall back to opening the original image in a new tab.
  async function handleDownloadImage() {
    if (!imageUrl) return
    setDownloading(true)
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error("fetch failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `carouselabs-image-${ideaId}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError("Could not download the image. Check your connection and try again.")
    } finally {
      setDownloading(false)
    }
  }

  async function handleSaveDraft() {
    if (!postId || savingDraft) return
    const savedValue = JSON.stringify({ caption, imageUrl, imagePrompt, size })
    setSavingDraft(true)
    setError(null)
    try {
      await getPostIdSynced()
      // A saved indicator always belongs to the submitted snapshot.
      setSavedSnapshot(savedValue)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed. Your edits are still here.")
    } finally {
      setSavingDraft(false)
    }
  }

  async function getPostIdSynced(): Promise<string | null> {
    if (!restoreChecked.current) throw new Error("Reload to check the saved draft before saving. Your browser copy is preserved.")
    if (!postId || !imageUrl) throw new Error("Generate an image before saving or scheduling.")
    if (isGeneratingImage) throw new Error("Wait for image generation to finish before saving or scheduling.")
    return (await writer.save(caption, postId, undefined, size ?? "4:5", { imageUrl, imagePrompt: imagePrompt ?? "" })).postId
  }

  function completeSelection(
    mode: StructureMode,
    custom: string | null,
    templateId: string | null,
  ) {
    console.log("Caption settings selected:", {
      selectedPlatform,
      structureMode: mode,
      customStructure: custom,
      selectedTemplateId: templateId,
    })
    setImageFlowStep("generating")
  }

  function handleSelectPlatform(platformId: string) {
    setSelectedPlatform(platformId)
    setImageFlowStep("structure-select")
  }

  // ── Image structure selection handlers (own-idea flow) ────────
  // Selection complete → log it and unlock the "Generate Image" button.
  function completeImageStructureSelection(
    mode: ImageStructureMode,
    custom: string | null,
    templateId: string | null,
  ) {
    console.log("Image structure selected:", {
      imageStructureMode: mode,
      customImageStructure: custom,
      selectedImageTemplateId: templateId,
    })
    setImageStructureStep("ready")
  }

  function handleSelectImageAuto() {
    setImageStructureMode("auto")
    completeImageStructureSelection("auto", null, null)
  }

  function handleSelectImageCustomMode() {
    setImageStructureMode("custom")
    setImageStructureStep("custom")
  }

  function handleSelectImageTemplateMode() {
    setImageStructureMode("template")
    setImageStructureStep("template")
  }

  function handleSelectImageReferenceOnly() {
    if (!referenceImage) return
    setImageStructureMode("reference-only")
    completeImageStructureSelection("reference-only", null, null)
  }

  function handleImageCustomContinue() {
    if (!customImageStructure.trim()) return
    completeImageStructureSelection("custom", customImageStructure.trim(), null)
  }

  function handleImageTemplatePick(templateId: string) {
    setSelectedImageTemplateId(templateId)
    completeImageStructureSelection("template", null, templateId)
  }

  const customImageWordCount = customImageStructure.trim()
    ? customImageStructure.trim().split(/\s+/).length
    : 0

  const steps = ["Platform", "Structure", "Caption", "Format", "Reference", "Image"]
  const stepIndex =
    imageFlowStep === "platform-select" ? 0 : imageFlowStep !== "generating" ? 1 : step + 1

  // Session-restore check still in flight — avoids flashing the
  // platform-select screen before a restored session takes over.
  if (initializing) {
    return <LoadingState label="Checking for a saved session..." />
  }

  // ── Platform + structure selection screens (every idea) ──
  if (imageFlowStep !== "generating") {
    return (
      <div>
        <CreateToolbar
          // Back — each step returns to the previous one
          back={
            imageFlowStep === "platform-select" ? (
              <BackLink href={`/idea/${ideaId}`}>Back to breakdown</BackLink>
            ) : (
              <BackButton
                onClick={() =>
                  setImageFlowStep(imageFlowStep === "structure-select" ? "platform-select" : "structure-select")
                }
              >
                {imageFlowStep === "structure-select" ? "Back to platforms" : "Back to structure options"}
              </BackButton>
            )
          }
          label="Image + Caption for"
          title={ideaHook}
          steps={steps}
          current={stepIndex}
        />
        <CaptionSetup
          step={imageFlowStep}
          platformQuestion="Which platform is this caption for?"
          selectedPlatform={selectedPlatform}
          onSelectPlatform={handleSelectPlatform}
          onSelectAuto={() => {
            setStructureMode("auto")
            completeSelection("auto", null, null)
          }}
          onSelectCustom={() => {
            setStructureMode("custom")
            setImageFlowStep("custom-input")
          }}
          onSelectTemplateMode={() => {
            setStructureMode("template")
            setImageFlowStep("template-select")
          }}
          customStructure={customStructure}
          onCustomStructureChange={setCustomStructure}
          onCustomContinue={() => {
            if (!customStructure.trim()) return
            completeSelection("custom", customStructure.trim(), null)
          }}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onTemplatePick={(templateId) => {
            setSelectedTemplateId(templateId)
            completeSelection("template", null, templateId)
          }}
        />
      </div>
    )
  }

  const isResult = step === 4 && imageStructureStep === "ready"
  const savedNow = saved && savedSnapshot === JSON.stringify({ caption, imageUrl, imagePrompt, size })

  return (
    <div>
      <CreateToolbar
        back={<BackLink href={`/idea/${ideaId}`}>Back to breakdown</BackLink>}
        title={ideaHook}
        steps={steps}
        current={stepIndex}
      />

      <div className={cn("mx-auto flex w-full flex-col gap-6", !isResult && "max-w-2xl")}>
        {browserRecovery !== null && <DraftRecoveryNotice onRestore={() => {
          setCaption(browserRecovery.caption ?? "")
          setCaptionReady(Boolean(browserRecovery.caption))
          setImagePrompt(browserRecovery.prompt ?? "")
          setImageUrl(browserRecovery.imageUrl)
          setSize(browserRecovery.size)
          setSaved(false)
          persistBrowserDraft(browserRecovery, writer.revision(), true)
          setBrowserRecovery(null)
        }} />}

        {/* Restored badge + chosen platform/structure */}
        {(restored || selectedPlatform || structureMode) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {restored && <RestoredTag />}
            {selectedPlatform && <PlatformTag platformId={selectedPlatform} />}
            {structureMode && <StructureTag mode={structureMode} templateId={selectedTemplateId} />}
          </div>
        )}
      </div>

      <div className="mt-8">
        {/* ── STEP 1: Caption Generation ── */}
        {step === 1 && (
          <StepColumn>
            <ChoiceHeader title="Your Caption" />

            {isStreamingCaption && !caption && <CaptionSkeleton />}

            {/* First generation — no caption yet. The voice-guidelines toggle sits
                above the button so the user can opt in before generating. */}
            {!caption && !isStreamingCaption && (
              <div className="flex flex-col items-start gap-5 rounded-card border border-dashed border-control-border/60 bg-surface px-6 py-10">
                <VoiceGuidelinesToggle
                  hasGuidelines={hasGuidelines}
                  value={useVoiceGuidelines}
                  onChange={setUseVoiceGuidelines}
                />
                <Button size="lg" onClick={() => void streamCaption()}>
                  <Sparkles aria-hidden />
                  Generate Caption
                </Button>
              </div>
            )}

            {caption && (
              <>
                <div className="flex flex-col gap-1.5">
                  <textarea
                    aria-label="Caption"
                    value={caption}
                    onChange={(e) => handleCaptionChange(e.target.value)}
                    rows={16}
                    className={cn(captionFieldClasses, "resize-y bg-surface-raised")}
                  />
                  <div className="flex items-center justify-between text-caption text-muted-foreground tabular-nums">
                    <span>{countWords(caption) > 0 ? `${countWords(caption)} words` : ""}</span>
                    <span>{caption.length} chars</span>
                  </div>
                </div>
                <VoiceGuidelinesToggle
                  hasGuidelines={hasGuidelines}
                  value={useVoiceGuidelines}
                  onChange={setUseVoiceGuidelines}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <textarea
                    value={captionInstruction}
                    onChange={(e) => setCaptionInstruction(e.target.value)}
                    disabled={isStreamingCaption || atLimit}
                    rows={2}
                    aria-label="What should change?"
                    placeholder="What should change? (e.g. make it shorter, add more stats, make it funnier...)"
                    className={cn(controlClasses, "flex-1 resize-none px-3 py-2.5 leading-normal md:text-label")}
                  />
                  <Button
                    variant="outline"
                    onClick={handleRegenerateCaption}
                    disabled={isStreamingCaption || atLimit}
                    className="shrink-0"
                  >
                    Regenerate caption — 1 credit
                  </Button>
                </div>
              </>
            )}

            {error && (
              <ErrorNotice
                message={friendlyGenerationError(error)}
                onRetry={() => void streamCaption()}
                retryDisabled={isStreamingCaption}
              />
            )}

            <StepActions>
              <Button onClick={() => setStep(2)} disabled={!captionReady} className="ml-auto">
                Continue to Image →
              </Button>
            </StepActions>
          </StepColumn>
        )}

        {/* ── STEP 2: Choose Ratio ── */}
        {step === 2 && (
          <StepColumn>
            <ChoiceHeader title="Choose your image format" />

            <div className="grid grid-cols-2 gap-4">
              <RatioCard
                ratio="4:5"
                selected={size === "4:5"}
                onClick={() => selectSize("4:5")}
                title="4:5 Portrait"
                hint="Instagram, LinkedIn, Facebook"
              />
              <RatioCard
                ratio="1:1"
                selected={size === "1:1"}
                onClick={() => selectSize("1:1")}
                title="1:1 Square"
                hint="Instagram, Twitter/X, Facebook"
              />
            </div>

            <StepActions>
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!size} className="ml-auto">
                Continue →
              </Button>
            </StepActions>
          </StepColumn>
        )}

        {/* ── STEP 3: Reference Image ── */}
        {step === 3 && (
          <StepColumn>
            <ChoiceHeader
              title="Upload a style reference (optional)"
              description={<>We&apos;ll match the style — not copy the image</>}
            />

            <ReferenceUploader
              value={referenceImage}
              onChange={handleReferenceChange}
              onClear={handleReferenceClear}
            />

            {referenceNotice && (
              <p role="status" className="text-label text-warning">{referenceNotice}</p>
            )}

            <StepActions>
              <Button variant="ghost" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleReferenceClear()
                    setStep(4)
                  }}
                >
                  Skip, generate without reference
                </Button>
                {referenceImage && (
                  <Button onClick={() => setStep(4)}>Continue with reference →</Button>
                )}
              </div>
            </StepActions>
          </StepColumn>
        )}

        {/* ── STEP 4: Image structure selection or Final Screen ── */}
        {step === 4 && imageStructureStep !== "ready" && (
          <StepColumn>
            {imageStructureStep === "select" ? (
              <BackButton onClick={() => setStep(3)}>Back</BackButton>
            ) : (
              <BackButton onClick={() => setImageStructureStep("select")}>Back to structure options</BackButton>
            )}

            {/* ── Main selection: 4 cards ─────────────────────────── */}
            {imageStructureStep === "select" && (
              <>
                <ChoiceHeader
                  title="How should this image be structured?"
                  description="Choose the best visual format for your content."
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    emoji="🤖"
                    title="Let AI Decide"
                    subtitle="AI analyzes your content and picks the best visual structure automatically."
                    onClick={handleSelectImageAuto}
                  />
                  <ChoiceCard
                    emoji="✍️"
                    title={<>I&apos;ll Define It</>}
                    subtitle="Describe exactly how you want the image structured."
                    onClick={handleSelectImageCustomMode}
                  />
                  <ChoiceCard
                    emoji="📋"
                    title="Choose a Template"
                    subtitle="Pick from 20 proven visual structures."
                    onClick={handleSelectImageTemplateMode}
                  />
                  <ChoiceCard
                    emoji="🖼️"
                    title={<>Follow My Reference Image&apos;s Structure</>}
                    subtitle={
                      referenceImage
                        ? "Use the same layout and structure as your uploaded reference image."
                        : "Upload a reference image first to use this option"
                    }
                    onClick={handleSelectImageReferenceOnly}
                    disabled={!referenceImage}
                  />
                </div>
              </>
            )}

            {/* ── Custom structure input ───────────────────────────── */}
            {imageStructureStep === "custom" && (
              <>
                <ChoiceHeader title="Define your image structure" />
                <div className="flex flex-col gap-2">
                  <textarea
                    value={customImageStructure}
                    onChange={(e) => setCustomImageStructure(e.target.value)}
                    rows={5}
                    autoFocus
                    aria-label="Define your image structure"
                    placeholder="Describe how you want this image structured (e.g. split into 3 sections showing before, during, after)"
                    className={cn(controlClasses, "resize-none px-4 py-3 leading-relaxed")}
                  />
                  <p className="text-caption text-muted-foreground tabular-nums" aria-live="polite">
                    {customImageWordCount} {customImageWordCount === 1 ? "word" : "words"}
                  </p>
                </div>
                <Button
                  onClick={handleImageCustomContinue}
                  disabled={!customImageStructure.trim()}
                  className="self-start"
                >
                  Continue →
                </Button>
              </>
            )}

            {/* ── Template grid — tabbed by category ───────────────── */}
            {imageStructureStep === "template" && (
              <>
                <ChoiceHeader title="Pick a visual structure" />
                <CategoryChips
                  categories={IMAGE_CATEGORY_ORDER}
                  value={selectedImageCategory}
                  onChange={setSelectedImageCategory}
                />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(getImageTemplatesByCategory()[selectedImageCategory] ?? []).map((template) => (
                    <ChoiceCard
                      key={template.id}
                      title={template.name}
                      subtitle={template.description}
                      onClick={() => handleImageTemplatePick(template.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </StepColumn>
        )}

        {isResult && (
          <>
            <Workspace
              panelLabel="Caption"
              canvas={
                <>
                  <BackButton onClick={() => setStep(3)} arrow={false}>
                    ← Back
                  </BackButton>

                  {error && (
                    <ErrorNotice
                      message={friendlyGenerationError(error)}
                      onRetry={() => void generateImageForOwnIdea().catch(() => {})}
                      retryDisabled={isGeneratingImage}
                    />
                  )}

                  <h1 className="sr-only">Image + Caption</h1>

                  <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
                    {/* Generated image (the prompt step is bypassed) */}
                    {imageUrl && !isGeneratingImage && (
                      <>
                        <ImagePreview
                          src={imageUrl}
                          alt="Generated LinkedIn image"
                          size={size ?? undefined}
                        />
                        {/* Custom instruction — only after a successful generation. Typing
                            here + clicking "Regenerate Image" applies the change. */}
                        <InstructionBox value={imageInstruction} onChange={setImageInstruction} />
                        <Button
                          variant="outline"
                          onClick={handleRegenerateImage}
                          disabled={atLimit}
                          className="self-start"
                        >
                          <RefreshCw aria-hidden />
                          Regenerate Image — 8 credits
                        </Button>
                      </>
                    )}

                    {isGeneratingImage && (
                      <div
                        role="status"
                        className={cn(
                          "flex flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface px-6 text-center",
                          size === "1:1" ? "aspect-square" : "aspect-[4/5]"
                        )}
                      >
                        <Loader2 className="size-9 animate-spin text-foreground motion-reduce:animate-none" aria-hidden />
                        <p className="text-label font-medium text-foreground">
                          {imageGenStage === "structure" && "Deciding the best visual structure…"}
                          {imageGenStage === "prompt" && "Writing your image prompt…"}
                          {(imageGenStage === "image" || imageGenStage === null) && "Generating your image…"}
                        </p>
                        <p className="text-caption text-muted-foreground">(this can take up to a minute)</p>
                      </div>
                    )}

                    {/* Single button — generates the prompt then the image in one go. No
                        instruction box before generation; it appears only after success.
                        Every idea runs the 3-stage pipeline now. */}
                    {!imageUrl && !isGeneratingImage && (
                      <div
                        className={cn(
                          "flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-control-border/60 bg-surface px-6",
                          size === "1:1" ? "aspect-square" : "aspect-[4/5]"
                        )}
                      >
                        <Button size="lg" onClick={() => void generateImageForOwnIdea().catch(() => {})}>
                          <Sparkles aria-hidden />
                          Generate Image
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              }
              panel={
                <>
                  {/* Once generation has started, the game stays here so the user can
                      keep playing even after the image loads. */}
                  {gameStarted && <LoadingGame />}

                  <div className="flex flex-col gap-2">
                    <FieldLabel htmlFor="image-caption">Caption</FieldLabel>
                    <textarea
                      id="image-caption"
                      value={caption}
                      onChange={(e) => handleCaptionChange(e.target.value)}
                      rows={16}
                      className={cn(captionFieldClasses, "resize-y bg-surface-raised")}
                    />
                    {countWords(caption) > 0 && (
                      <p className="text-caption text-muted-foreground tabular-nums">{countWords(caption)} words</p>
                    )}
                    {/* Same validatePostForPlatform used by Content Hub's Custom Post
                        Composer, so an AI caption that runs long gets the same
                        treatment as one a user typed by hand. */}
                    {caption.trim() && selectedPlatform && isValidPlatform(selectedPlatform) && (
                      <PlatformChecks {...validatePostForPlatform(caption, imageUrl ? 1 : 0, selectedPlatform)} />
                    )}
                  </div>
                </>
              }
            />

            <div className="mt-8">
              <ActionBar>
                <Button variant="ghost" size="sm" onClick={handleCopyCaption}>
                  {captionCopied ? <Check className="text-success" aria-hidden /> : <Copy aria-hidden />}
                  {captionCopied ? "Copied!" : "Copy Caption"}
                </Button>
                {postId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    aria-busy={savingDraft || undefined}
                    className={cn(savedNow && !savingDraft && "border-success/40 bg-success-soft text-success hover:bg-success-soft")}
                  >
                    {savingDraft ? <Loader2 className="animate-spin" aria-hidden /> : savedNow ? <Check aria-hidden /> : <Save aria-hidden />}
                    {savingDraft ? "Saving…" : savedNow ? "Saved!" : "Save Draft"}
                  </Button>
                )}
                {imageUrl && !isGeneratingImage && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadImage}
                      disabled={downloading}
                      aria-busy={downloading || undefined}
                    >
                      {downloading ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                      {downloading ? "Downloading…" : "Download HD Image"}
                    </Button>
                    <ScheduleForLaterButton getPostId={getPostIdSynced} disabled={!imageUrl || !postId} />
                    <PostToLinkedInButton
                      caption={caption}
                      imageUrls={imageUrl ? [imageUrl] : []}
                      disabled={!imageUrl}
                    />
                  </>
                )}
              </ActionBar>
            </div>
          </>
        )}
      </div>

      {/* Regeneration limit toast */}
      <RegenerationLimit
        open={toastMsg !== null}
        message={toastMsg ?? ""}
        onClose={() => setToastMsg(null)}
      />
    </div>
  )
}
