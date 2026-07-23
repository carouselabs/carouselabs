"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, History, Sparkles } from "lucide-react"
import { CAPTION_TEMPLATES, CATEGORY_ORDER, getTemplatesByCategory } from "@/lib/captionTemplates"
import { CAPTION_PLATFORMS } from "@/lib/captionPlatforms"
import { CaptionEditor } from "@/components/generate/CaptionEditor"
import { VoiceGuidelinesToggle } from "@/components/generate/VoiceGuidelinesToggle"
import { ToneSelector, type Tone } from "@/components/generate/ToneSelector"
import { HookVariations } from "@/components/generate/HookVariations"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { VersionHistory } from "@/components/generate/VersionHistory"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"
import { friendlyGenerationError } from "@/lib/friendlyError"
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
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [instruction, setInstruction] = useState("")
  // Opt-in flag: apply the user's saved voice guidelines on the next generation.
  const [useVoiceGuidelines, setUseVoiceGuidelines] = useState(false)
  const bufferRef = useRef("")
  const didInit = useRef(false)
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
      const res = await fetch(`/api/posts?ideaId=${ideaId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.post?.caption) {
          setCaption(data.post.caption)
          setRestored(true)
          // A caption already exists — skip structure selection entirely.
          setCaptionStep("generating")
          trackHistory(ideaId, "CAPTION_DONE")
          return
        }
      }
    } catch {
      // fall through — user generates manually below
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

  // Persist the generated caption so it survives a page revisit.
  async function saveCaption(text: string) {
    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, caption: text }),
      })
    } catch {
      // best-effort — user can still Save Draft manually
    }
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
      saveCaption(parsed.captionText)
      // Credits were charged server-side — refresh the Topbar balance.
      void useCreditStore.getState().refresh()
    } catch (err) {
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

  const customWordCount = customStructure.trim()
    ? customStructure.trim().split(/\s+/).length
    : 0

  // ── Structure selection screens ───────────────────────────────
  if (captionStep !== "generating") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        {/* Back — each step returns to the previous one */}
        {captionStep === "platform-select" ? (
          <Link
            href={`/idea/${ideaId}`}
            className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2.2} />
            Back to breakdown
          </Link>
        ) : (
          <button
            onClick={() =>
              setCaptionStep(
                captionStep === "structure-select" ? "platform-select" : "structure-select",
              )
            }
            className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2.2} />
            {captionStep === "structure-select" ? "Back to platforms" : "Back to structure options"}
          </button>
        )}

        {/* Idea hook */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
            Caption for
          </p>
          <p className="text-[15px] font-medium text-[#4B5563] leading-[1.4]">
            {ideaHook}
          </p>
          {/* Selected platform carries through the later steps */}
          {selectedPlatform && captionStep !== "platform-select" && (
            <span className="mt-1 self-start inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7C3AED] bg-[rgba(124,58,237,0.08)]">
              {(() => {
                const p = CAPTION_PLATFORMS.find((p) => p.id === selectedPlatform)
                return p ? `${p.emoji} ${p.name}` : selectedPlatform
              })()}
            </span>
          )}
        </div>

        {/* ── Platform selection: 8 cards ──────────────────────── */}
        {captionStep === "platform-select" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[18px] font-bold text-[#0A0A0A] tracking-[-0.01em]">
                Which platform is this caption for?
              </h2>
              <p className="text-[13px] text-[#6B7280] leading-[1.55]">
                We&apos;ll tailor the tone, length, and style to match.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CAPTION_PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleSelectPlatform(platform.id)}
                  className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-[#F4F2EC] border border-[#E9E7E1] text-left hover:border-[#7C3AED] hover:bg-[rgba(124,58,237,0.05)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"
                >
                  <span className="text-[24px] leading-none">{platform.emoji}</span>
                  <span className="text-[13px] font-semibold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors">
                    {platform.name}
                  </span>
                  <span className="self-start text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-[#7C3AED] bg-[rgba(124,58,237,0.08)] tabular-nums">
                    {platform.charLimit.toLocaleString()} chars
                  </span>
                  <span className="text-[11px] text-[#9CA3AF] leading-[1.5]">
                    {platform.guidance}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Main selection: 3 large cards ────────────────────── */}
        {captionStep === "structure-select" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-[#0A0A0A] tracking-[-0.01em]">
              How should your caption be structured?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  emoji: "🤖",
                  title: "Auto (AI Chooses)",
                  subtitle:
                    "AI analyzes the topic and automatically selects or combines the best caption structure.",
                  onClick: handleSelectAuto,
                },
                {
                  emoji: "✍️",
                  title: "Define Your Own",
                  subtitle: "Tell us exactly how you want your caption structured.",
                  onClick: handleSelectCustom,
                },
                {
                  emoji: "📋",
                  title: "Choose a Template",
                  subtitle: "Pick from proven caption frameworks.",
                  onClick: handleSelectTemplateMode,
                },
              ].map((opt) => (
                <button
                  key={opt.title}
                  onClick={opt.onClick}
                  className="group flex flex-col items-start gap-2.5 p-5 rounded-xl bg-[#F4F2EC] border border-[#E9E7E1] text-left hover:border-[#7C3AED] hover:bg-[rgba(124,58,237,0.05)] hover:shadow-[0_10px_28px_rgba(124,58,237,0.08)] transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"
                >
                  <span className="text-[26px] leading-none">{opt.emoji}</span>
                  <span className="text-[14px] font-semibold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors">
                    {opt.title}
                  </span>
                  <span className="text-[12px] text-[#6B7280] leading-[1.5]">
                    {opt.subtitle}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Custom structure input ───────────────────────────── */}
        {captionStep === "custom-input" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-[#0A0A0A] tracking-[-0.01em]">
              Define your caption structure
            </h2>
            <div className="flex flex-col gap-2">
              <textarea
                value={customStructure}
                onChange={(e) => setCustomStructure(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Describe how you want your caption structured (e.g. Hook, then 3 quick tips, then a question at the end)"
                className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[14px] text-[#0A0A0A] leading-[1.6] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
              />
              <p className="text-[11px] text-[#ADA99F] tabular-nums">
                {customWordCount} {customWordCount === 1 ? "word" : "words"}
              </p>
            </div>
            <button
              onClick={handleCustomContinue}
              disabled={!customStructure.trim()}
              className={[
                "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
                customStructure.trim()
                  ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.28)]"
                  : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
              ].join(" ")}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Template grid — tabbed by category ───────────────── */}
        {captionStep === "template-select" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-bold text-[#0A0A0A] tracking-[-0.01em]">
              Pick a caption framework
            </h2>

            {/* Category tabs — horizontally scrollable */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={[
                    "flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all cursor-pointer",
                    selectedCategory === cat
                      ? "bg-[#7C3AED] text-white shadow-[0_0_16px_rgba(124,58,237,0.25)]"
                      : "bg-[#F4F2EC] text-[#6B7280] border border-[#E9E7E1] hover:border-[rgba(124,58,237,0.4)] hover:text-[#7C3AED]",
                  ].join(" ")}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Templates for the selected category only */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(getTemplatesByCategory()[selectedCategory] ?? []).map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplatePick(template.id)}
                  className="group flex flex-col items-start gap-2 p-4 rounded-xl bg-[#F4F2EC] border border-[#E9E7E1] text-left hover:border-[#7C3AED] hover:bg-[rgba(124,58,237,0.05)] transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/50"
                >
                  <span className="text-[20px] leading-none">{template.emoji}</span>
                  <span className="text-[13px] font-semibold text-[#0A0A0A] group-hover:text-[#7C3AED] transition-colors">
                    {template.name}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF] leading-[1.5]">
                    {template.structure.join(" → ")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {/* Back */}
      <Link
        href={`/idea/${ideaId}`}
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to breakdown
      </Link>

      {/* Idea hook */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-[#ADA99F] uppercase tracking-widest">
          Caption for
        </p>
        <p className="text-[15px] font-medium text-[#4B5563] leading-[1.4]">
          {ideaHook}
        </p>
        {restored && (
          <span className="mt-1 self-start inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-[#1A1A1A] bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.2)]">
            <History size={11} strokeWidth={2.2} />
            Restored from last session
          </span>
        )}
        {/* Chosen platform + structure — absent on restored sessions (no selection made) */}
        {(selectedPlatform || structureMode) && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {selectedPlatform && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7C3AED] bg-[rgba(124,58,237,0.08)]">
                {(() => {
                  const p = CAPTION_PLATFORMS.find((p) => p.id === selectedPlatform)
                  return p ? `${p.emoji} ${p.name}` : selectedPlatform
                })()}
              </span>
            )}
            {structureMode && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full text-[#7C3AED] bg-[rgba(124,58,237,0.08)]">
                {structureMode === "auto" && "🤖 Auto structure"}
                {structureMode === "custom" && "✍️ Custom structure"}
                {structureMode === "template" &&
                  (() => {
                    const t = CAPTION_TEMPLATES.find((t) => t.id === selectedTemplateId)
                    return t ? `${t.emoji} ${t.name}` : "📋 Template"
                  })()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tone selector — clicking triggers regeneration */}
      <ToneSelector
        selected={tone}
        onSelect={handleToneSelect}
        disabled={isGenerating || atLimit}
      />

      {/* Error — technical parse failures become a friendly retry message */}
      {error && (
        <div className="flex flex-col gap-3">
          <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
            {friendlyGenerationError(error)}
          </div>
          <button
            onClick={() => void generate(tone).catch(() => {})}
            disabled={isGenerating}
            className="self-start text-[13px] font-medium text-[#1A1A1A] hover:text-black transition-colors disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Opt-in voice guidelines — only rendered if the user has saved some. Set
          BEFORE generating so the very first caption can honor the preference. */}
      <VoiceGuidelinesToggle
        hasGuidelines={hasGuidelines}
        value={useVoiceGuidelines}
        onChange={setUseVoiceGuidelines}
      />

      {/* First generation — no caption yet. Generates directly (not counted as a
          regeneration) so the toggle above can be set first. */}
      {!caption && !isGenerating && (
        <button
          onClick={() => void generate(tone).catch(() => {})}
          className="self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-[#000000] shadow-[0_0_24px_rgba(26,26,26,0.22)] transition-all"
        >
          <Sparkles size={14} strokeWidth={2} />
          Generate Caption
        </button>
      )}

      {/* Regeneration instruction — only relevant once a caption exists */}
      {(caption || isGenerating) && (
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={isGenerating || atLimit}
          rows={2}
          placeholder="What should change? (e.g. make it shorter, add more stats, make it funnier...)"
          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[13px] text-[#374151] leading-[1.5] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(26,26,26,0.4)] transition-colors disabled:opacity-50"
        />
      )}

      {/* Caption editor — only shown once generation has started or a caption
          exists, so the empty editor + its Regenerate button don't appear before
          the first "Generate Caption" click. */}
      {(caption || isGenerating) && (
      <CaptionEditor
        caption={caption}
        onChange={setCaption}
        isGenerating={isGenerating}
        ideaId={ideaId}
        onRegenerate={() => handleRegenerate(tone)}
        regenerateDisabled={atLimit}
      />
      )}

      {/* Version history — silent, below the editor */}
      <VersionHistory versions={versions} onRestore={(content) => setCaption(content)} />

      {/* Hook variations — appear after generation completes */}
      {hooks.length > 0 && !isGenerating && (
        <HookVariations hooks={hooks} onSelect={handleHookReplace} />
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
