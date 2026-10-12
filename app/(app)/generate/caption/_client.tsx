"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, PanelRightClose, PanelRightOpen, RefreshCw } from "lucide-react"
import { CAPTION_TEMPLATES, CATEGORY_ORDER } from "@/lib/captionTemplates"
import { isValidPlatform, validatePostForPlatform } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { controlClasses } from "@/components/ui/input"
import {
  BackButton,
  BackLink,
  CreateToolbar,
  ErrorNotice,
  LoadingState,
  PlatformChecks,
  PlatformTag,
  RestoredTag,
  StructureTag,
  Workspace,
} from "@/components/create/CreateKit"
import { CaptionSetup } from "@/components/create/CaptionSetup"
import { CaptionEditor } from "@/components/generate/CaptionEditor"
import { VoiceGuidelinesToggle } from "@/components/generate/VoiceGuidelinesToggle"
import { ToneSelector, type Tone } from "@/components/generate/ToneSelector"
import { HookVariations } from "@/components/generate/HookVariations"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { VersionHistory } from "@/components/generate/VersionHistory"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"
import { friendlyGenerationError } from "@/lib/friendlyError"
import { createDraftWriter } from "@/lib/postDraft"
import { persistDraftValues, reconcileDraft } from "@/lib/draftRecovery"
import { DraftRecoveryNotice } from "@/components/generate/DraftRecoveryNotice"
import { useCreditStore } from "@/lib/store/creditStore"

interface CaptionClientProps {
  ideaId: string
  ideaHook: string
  hasGuidelines: boolean
}

const HOOKS_DELIM = "---HOOKS---"

type CaptionStep =
  | "platform-select"
  | "structure-select"
  | "custom-input"
  | "template-select"
  | "generating"
type StructureMode = "auto" | "custom" | "template"

function parseFullResponse(raw: string) {
  const hooksIdx = raw.indexOf(HOOKS_DELIM)

  // Caption is everything before ---HOOKS--- (hashtags are embedded inside it)
  const captionText = hooksIdx !== -1
    ? raw.slice(0, hooksIdx).trim()
    : raw.trim()

  const hooks: string[] = []
  if (hooksIdx !== -1) {
    const hooksRaw = raw.slice(hooksIdx + HOOKS_DELIM.length)
    hooks.push(
      ...hooksRaw
        .split("\n")
        .map((l) => l.replace(/^\d+\.\s*/, "").trim())
        .filter((l) => l.length > 8)
        .slice(0, 3),
    )
  }

  return { captionText, hooks }
}

export function CaptionClient({ ideaId, ideaHook, hasGuidelines }: CaptionClientProps) {
  // Structure selection — runs BEFORE caption generation. Not wired into the
  // generation request yet; the selection is logged and prompts come later.
  const [captionStep, setCaptionStep] = useState<CaptionStep>("platform-select")
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [structureMode, setStructureMode] = useState<StructureMode | null>(null)
  const [customStructure, setCustomStructure] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_ORDER[0])

  const [caption, setCaption] = useState("")
  const [hooks, setHooks] = useState<string[]>([])
  const [tone, setTone] = useState<Tone | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  // True until init()'s session-restore check resolves — avoids flashing the
  // platform-select screen before a restored session flips captionStep away
  // from its "platform-select" default.
  const [initializing, setInitializing] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [instruction, setInstruction] = useState("")
  // Opt-in flag: apply the user's saved voice guidelines on the next generation.
  const [useVoiceGuidelines, setUseVoiceGuidelines] = useState(false)
  // Presentation only: the editor reports its save so Regenerate stays
  // disabled meanwhile (it used to share a toolbar with Save), and the
  // settings panel can be folded away on wide screens.
  const [editorSaving, setEditorSaving] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const bufferRef = useRef("")
  const didInit = useRef(false)
  const [writer] = useState(() => createDraftWriter(ideaId, fetch, `captionDraft_${ideaId}`))
  const restoreChecked = useRef(false)
  const [browserRecovery, setBrowserRecovery] = useState<string | null>(null)
  // Guards against rapid double-clicks firing two simultaneous generations
  // (each of which would be charged server-side).
  const isChargingRef = useRef(false)

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

  async function init() {
    try {
      let recovered: string | null = null
      try { recovered = localStorage.getItem(`captionDraft_${ideaId}`) } catch { /* Browser storage can be unavailable. */ }
      if (recovered !== null) {
        setCaption(recovered)
        setRestored(true)
        setCaptionStep("generating")
      }
      const res = await fetch(`/api/posts?ideaId=${encodeURIComponent(ideaId)}&format=TEXT_ONLY`, { signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error("Saved posts could not be checked. Your browser draft is preserved; reload before saving or scheduling.")
      if (res.ok) {
        const data = await res.json()
        restoreChecked.current = true
        if (data.post) {
          writer.restore({ postId: data.post.id, caption: data.post.caption ?? "", updatedAt: data.post.updatedAt })
          const selected = reconcileDraft(`captionDraft_${ideaId}`, recovered, data.post.caption ?? "", data.post.updatedAt)
          setCaption(selected.draft)
          setBrowserRecovery(selected.recovery)
          persistBrowserDraft(selected.draft, data.post.updatedAt)
          setRestored(true)
          // A caption already exists — skip structure selection entirely.
          setCaptionStep("generating")
          trackHistory(ideaId, "CAPTION_DONE")
          return
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore the saved draft. Reload before saving or scheduling.")
      setCaptionStep("generating")
    } finally {
      setInitializing(false)
    }
    // No auto-generation on mount: the user picks their voice-guidelines
    // preference first, then clicks "Generate Caption" (see the button below).
  }

  // On mount: restore a previously saved caption if one exists, otherwise
  // auto-generate. Guarded so it runs exactly once (no StrictMode double-run).
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep unfinished edits on this device; network persistence is explicit and
  // serialized with generation saves, including saves initiated by scheduling.
  useEffect(() => {
    if (initializing || isGenerating || captionStep !== "generating") return
    const persist = () => {
      try { localStorage.setItem(`captionDraft_${ideaId}`, caption) }
      catch { setError("Browser draft recovery is unavailable. Save Draft before leaving this page.") }
    }
    const timer = setTimeout(persist, 150)
    window.addEventListener("pagehide", persist)
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", persist) }
  }, [caption, ideaId, initializing, isGenerating, captionStep])

  function persistBrowserDraft(value: string, revision = writer.revision(), clearRecovery = false) {
    try { persistDraftValues(`captionDraft_${ideaId}`, { [`captionDraft_${ideaId}`]: value }, revision, clearRecovery) }
    catch { setError("Browser draft recovery is unavailable. Save Draft before leaving this page.") }
  }

  async function saveCaption(text: string): Promise<string> {
    if (!restoreChecked.current) throw new Error("Reload to check the saved draft before saving. Your browser copy is preserved.")
    return (await writer.save(text)).postId
  }

  async function generate(
    activeTone: Tone | null,
    userInstruction?: string,
    currentCaption?: string,
    isRegen = false,
  ) {
    if (isChargingRef.current) return
    isChargingRef.current = true
    setIsGenerating(true)
    setRestored(false)
    const previousCaption = caption
    setCaption("")
    setHooks([])
    setError(null)
    bufferRef.current = ""

    try {
      const res = await fetch("/api/generate/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          tone: activeTone ?? undefined,
          userInstruction,
          currentCaption,
          useVoiceGuidelines,
          // Server-side charging flags: this flow's post cost is caption_only;
          // regens carry the current caption as evidence and cost 1 credit.
          flow: "caption_only",
          isRegen,
          // Platform + structure selection — switches the API to the V2 master
          // prompt. Absent (restored sessions) the API uses the legacy prompt.
          platform: selectedPlatform ?? undefined,
          structureMode: structureMode ?? undefined,
          templateStructure:
            structureMode === "template"
              ? CAPTION_TEMPLATES.find((t) => t.id === selectedTemplateId)?.structure
              : undefined,
          customStructure: structureMode === "custom" ? customStructure : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Failed to generate caption")
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bufferRef.current += decoder.decode(value, { stream: true })

        // Stream caption tokens into editor, stopping at the hooks delimiter
        const hooksAt = bufferRef.current.indexOf(HOOKS_DELIM)
        setCaption(
          hooksAt === -1
            ? bufferRef.current
            : bufferRef.current.slice(0, hooksAt).trim(),
        )
      }

      // Parse the complete buffered response for hooks
      const parsed = parseFullResponse(bufferRef.current)
      setCaption(parsed.captionText)
      setHooks(parsed.hooks)
      trackHistory(ideaId, "CAPTION_DONE")
      try { await saveCaption(parsed.captionText) }
      catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Caption generated, but saving failed. Use Save Draft to retry.") }
      // Credits were charged server-side — refresh the Topbar balance.
      void useCreditStore.getState().refresh()
    } catch (err) {
      setCaption(previousCaption)
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let callers (handleRegenerate) know it failed
    } finally {
      isChargingRef.current = false
      setIsGenerating(false)
    }
  }

  // User-initiated regeneration — enforces the 2-per-session limit and saves
  // the current caption to version history before regenerating. Reads the
  // count imperatively (getState) so it can't act on a stale render value,
  // and increments BEFORE generating so rapid clicks can't slip through.
  async function handleRegenerate(activeTone: Tone | null) {
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
    // evidence that this is a 1-credit regeneration, not a first generation.
    const userInstruction = instruction.trim() || undefined
    const currentCaption = caption || undefined
    setInstruction("")
    // Reserve the slot synchronously BEFORE generating, so a second call can't
    // read a stale count and slip past the limit.
    increment(ideaId)
    try {
      await generate(activeTone, userInstruction, currentCaption, true)
      const newCount = useRegenerationStore.getState().regenerationCount[ideaId] ?? 0
      if (newCount >= MAX_REGENERATIONS) {
        setToastMsg("You've used both regenerations for this session")
        setTimeout(() => setToastMsg(null), 5000)
      }
    } catch {
      decrement(ideaId) // generation failed — refund the reserved slot
    }
  }

  function handleToneSelect(newTone: Tone) {
    setTone(newTone)
    handleRegenerate(newTone)
  }

  function handleHookReplace(hook: string) {
    setCaption((prev) => {
      const lines = prev.split("\n")
      lines[0] = hook
      return lines.join("\n")
    })
  }

  // ── Structure selection handlers ──────────────────────────────
  // Selection is complete → log it (generation prompts wired up later) and
  // move on to the existing generation screen. Values are passed explicitly
  // because the setState calls haven't committed yet when we log.
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
    setCaptionStep("generating")
  }

  function handleSelectPlatform(platformId: string) {
    setSelectedPlatform(platformId)
    setCaptionStep("structure-select")
  }

  function handleSelectAuto() {
    setStructureMode("auto")
    completeSelection("auto", null, null)
  }

  function handleSelectCustom() {
    setStructureMode("custom")
    setCaptionStep("custom-input")
  }

  function handleSelectTemplateMode() {
    setStructureMode("template")
    setCaptionStep("template-select")
  }

  function handleCustomContinue() {
    if (!customStructure.trim()) return
    completeSelection("custom", customStructure.trim(), null)
  }

  function handleTemplatePick(templateId: string) {
    setSelectedTemplateId(templateId)
    completeSelection("template", null, templateId)
  }

  const steps = ["Platform", "Structure", "Caption"]
  const stepIndex = captionStep === "platform-select" ? 0 : captionStep === "generating" ? 2 : 1

  // Session-restore check still in flight — avoids flashing the
  // platform-select screen before a restored session takes over.
  if (initializing) {
    return <LoadingState label="Checking for a saved session..." />
  }

  // ── Structure selection screens ───────────────────────────────
  if (captionStep !== "generating") {
    return (
      <div>
        <CreateToolbar
          // Back — each step returns to the previous one
          back={
            captionStep === "platform-select" ? (
              <BackLink href={`/idea/${ideaId}`}>Back to breakdown</BackLink>
            ) : (
              <BackButton
                onClick={() =>
                  setCaptionStep(captionStep === "structure-select" ? "platform-select" : "structure-select")
                }
              >
                {captionStep === "structure-select" ? "Back to platforms" : "Back to structure options"}
              </BackButton>
            )
          }
          label="Caption for"
          title={ideaHook}
          steps={steps}
          current={stepIndex}
        />
        <CaptionSetup
          step={captionStep}
          platformQuestion="Which platform is this caption for?"
          selectedPlatform={selectedPlatform}
          onSelectPlatform={handleSelectPlatform}
          onSelectAuto={handleSelectAuto}
          onSelectCustom={handleSelectCustom}
          onSelectTemplateMode={handleSelectTemplateMode}
          customStructure={customStructure}
          onCustomStructureChange={setCustomStructure}
          onCustomContinue={handleCustomContinue}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onTemplatePick={handleTemplatePick}
        />
      </div>
    )
  }

  const hasEditor = Boolean(caption || isGenerating)

  return (
    <div>
      <CreateToolbar
        back={<BackLink href={`/idea/${ideaId}`}>Back to breakdown</BackLink>}
        label="Caption for"
        title={ideaHook}
        steps={steps}
        current={stepIndex}
        right={
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={panelOpen}
            aria-controls="caption-settings"
            onClick={() => setPanelOpen((o) => !o)}
            className="hidden lg:inline-flex"
          >
            {panelOpen ? <PanelRightClose aria-hidden /> : <PanelRightOpen aria-hidden />}
            Settings
          </Button>
        }
      />

      <h1 className="sr-only">Caption</h1>

      {browserRecovery !== null && (
        <div className="mb-6">
          <DraftRecoveryNotice onRestore={() => {
            setCaption(browserRecovery)
            persistBrowserDraft(browserRecovery, writer.revision(), true)
            setBrowserRecovery(null)
          }} />
        </div>
      )}

      <Workspace
        panelId="caption-settings"
        panelLabel="Caption settings"
        panelOpen={panelOpen}
        canvas={
          <>
            {/* Restored badge + chosen platform/structure — the latter absent on
                restored sessions (no selection made) */}
            {(restored || selectedPlatform || structureMode) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {restored && <RestoredTag />}
                {selectedPlatform && <PlatformTag platformId={selectedPlatform} />}
                {structureMode && <StructureTag mode={structureMode} templateId={selectedTemplateId} />}
              </div>
            )}

            {/* Error — technical parse failures become a friendly retry message */}
            {error && (
              <ErrorNotice
                message={friendlyGenerationError(error)}
                onRetry={() => void generate(tone).catch(() => {})}
                retryDisabled={isGenerating}
              />
            )}

            {/* First generation — no caption yet. Generates directly (not counted as a
                regeneration); the voice-guidelines toggle sits beside the button so
                the very first caption can honor the preference. */}
            {!hasEditor && (
              <div className="flex flex-col items-start gap-5 rounded-card border border-dashed border-control-border/60 bg-surface px-6 py-10 md:px-10 md:py-14">
                <VoiceGuidelinesToggle
                  hasGuidelines={hasGuidelines}
                  value={useVoiceGuidelines}
                  onChange={setUseVoiceGuidelines}
                />
                <Button size="lg" onClick={() => void generate(tone).catch(() => {})} disabled={isGenerating}>
                  {isGenerating && <Loader2 className="animate-spin" aria-hidden />}
                  {isGenerating ? "Generating…" : "Generate Caption"}
                </Button>
              </div>
            )}

            {/* Caption editor — only once generation has started or a caption
                exists, so the empty editor doesn't appear before the first
                "Generate Caption" click. */}
            {hasEditor && (
              <CaptionEditor
                caption={caption}
                onChange={setCaption}
                isGenerating={isGenerating}
                onSave={saveCaption}
                onSavingChange={setEditorSaving}
              />
            )}

            {/* Real platform-limit check on the generated/edited caption — same
                validatePostForPlatform used by Content Hub's Custom Post Composer,
                so an AI caption that happens to run long gets the same treatment
                as one a user typed by hand. */}
            {!isGenerating && caption.trim() && selectedPlatform && isValidPlatform(selectedPlatform) && (
              <PlatformChecks {...validatePostForPlatform(caption, 0, selectedPlatform)} />
            )}
          </>
        }
        panel={
          <>
            {/* Tone selector — clicking triggers regeneration */}
            <ToneSelector
              selected={tone}
              onSelect={handleToneSelect}
              disabled={isGenerating || atLimit}
            />

            {/* Regeneration instruction + Regenerate — only once a caption exists */}
            {hasEditor && (
              <div className="flex flex-col gap-2.5">
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  disabled={isGenerating || atLimit}
                  rows={3}
                  aria-label="What should change?"
                  placeholder="What should change? (e.g. make it shorter, add more stats, make it funnier...)"
                  className={cn(controlClasses, "resize-none px-3 py-2.5 leading-normal md:text-label")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerate(tone)}
                  disabled={isGenerating || atLimit || editorSaving}
                  title="Regenerate — 1 credit"
                  className="self-start"
                >
                  {isGenerating ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
                  Regenerate — 1 credit
                </Button>
              </div>
            )}

            {/* Opt-in voice guidelines — only rendered if the user has saved some.
                Before the first caption it sits beside "Generate Caption". */}
            {hasEditor && (
              <VoiceGuidelinesToggle
                hasGuidelines={hasGuidelines}
                value={useVoiceGuidelines}
                onChange={setUseVoiceGuidelines}
              />
            )}

            {/* Hook variations — appear after generation completes */}
            {hooks.length > 0 && !isGenerating && (
              <HookVariations hooks={hooks} onSelect={handleHookReplace} />
            )}

            {/* Version history — silent */}
            <VersionHistory versions={versions} onRestore={(content) => setCaption(content)} />
          </>
        }
      />

      {/* Regeneration limit toast */}
      <RegenerationLimit
        open={toastMsg !== null}
        message={toastMsg ?? ""}
        onClose={() => setToastMsg(null)}
      />
    </div>
  )
}
