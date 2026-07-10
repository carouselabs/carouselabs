"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, History, Sparkles } from "lucide-react"
import { CaptionEditor } from "@/components/generate/CaptionEditor"
import { VoiceGuidelinesToggle } from "@/components/generate/VoiceGuidelinesToggle"
import { ToneSelector, type Tone } from "@/components/generate/ToneSelector"
import { HookVariations } from "@/components/generate/HookVariations"
import { RegenerationLimit } from "@/components/generate/RegenerationLimit"
import { VersionHistory } from "@/components/generate/VersionHistory"
import { trackHistory } from "@/lib/hooks/useHistory"
import { useRegenerationStore, MAX_REGENERATIONS } from "@/lib/store/regenerationStore"
import { friendlyGenerationError } from "@/lib/friendlyError"

interface CaptionClientProps {
  ideaId: string
  ideaHook: string
}

const HOOKS_DELIM = "---HOOKS---"

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

export function CaptionClient({ ideaId, ideaHook }: CaptionClientProps) {
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

  // On mount: restore a previously saved caption if one exists, otherwise
  // auto-generate. Guarded so it runs exactly once (no StrictMode double-run).
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function init() {
    try {
      const res = await fetch(`/api/posts?ideaId=${ideaId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.post?.caption) {
          setCaption(data.post.caption)
          setRestored(true)
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
  ) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      throw err // let callers (handleRegenerate) know it failed
    } finally {
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
    // Capture the instruction + current caption, then clear the input. Sending
    // the current caption lets the API do a targeted edit instead of a rewrite.
    const userInstruction = instruction.trim() || undefined
    const currentCaption = userInstruction ? caption : undefined
    setInstruction("")
    // Reserve the slot synchronously BEFORE generating, so a second call can't
    // read a stale count and slip past the limit.
    increment(ideaId)
    try {
      await generate(activeTone, userInstruction, currentCaption)
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
      <VoiceGuidelinesToggle checked={useVoiceGuidelines} onChange={setUseVoiceGuidelines} />

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
