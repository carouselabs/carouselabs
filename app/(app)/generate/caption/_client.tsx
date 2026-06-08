"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CaptionEditor } from "@/components/generate/CaptionEditor"

interface CaptionClientProps {
  ideaId: string
  ideaHook: string
}

export function CaptionClient({ ideaId, ideaHook }: CaptionClientProps) {
  const [caption, setCaption] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generate()
  }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setIsGenerating(true)
    setCaption("")
    setError(null)

    try {
      const res = await fetch("/api/generate/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId }),
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
        setCaption((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
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
        onRegenerate={generate}
      />
    </div>
  )
}
