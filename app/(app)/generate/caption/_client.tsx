"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CaptionEditor } from "@/components/generate/CaptionEditor"
import { ToneSelector, type Tone } from "@/components/generate/ToneSelector"
import { HookVariations } from "@/components/generate/HookVariations"

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
  const bufferRef = useRef("")

  useEffect(() => {
    generate(null)
  }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate(activeTone: Tone | null) {
    setIsGenerating(true)
    setCaption("")
    setHooks([])
    setError(null)
    bufferRef.current = ""

    try {
      const res = await fetch("/api/generate/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, tone: activeTone ?? undefined }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleToneSelect(newTone: Tone) {
    setTone(newTone)
    generate(newTone)
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
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[rgba(255,255,255,0.32)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to breakdown
      </Link>

      {/* Idea hook */}
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
          Caption for
        </p>
        <p className="text-[15px] font-medium text-[rgba(255,255,255,0.65)] leading-[1.4]">
          {ideaHook}
        </p>
      </div>

      {/* Tone selector — clicking triggers regeneration */}
      <ToneSelector
        selected={tone}
        onSelect={handleToneSelect}
        disabled={isGenerating}
      />

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {error}
        </div>
      )}

      {/* Caption editor */}
      <CaptionEditor
        caption={caption}
        onChange={setCaption}
        isGenerating={isGenerating}
        ideaId={ideaId}
        onRegenerate={() => generate(tone)}
      />

      {/* Hook variations — appear after generation completes */}
      {hooks.length > 0 && !isGenerating && (
        <HookVariations hooks={hooks} onSelect={handleHookReplace} />
      )}
    </div>
  )
}
