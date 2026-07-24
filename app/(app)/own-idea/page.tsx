"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Pencil } from "lucide-react"
import { countWords, truncateToWords } from "@/lib/wordCount"

const TITLE_WORD_LIMIT = 15
const STRUCTURE_WORD_LIMIT = 650

export default function OwnIdeaPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [structure, setStructure] = useState("")
  const [showStructure, setShowStructure] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleWordCount = countWords(title)
  const wordCount = countWords(structure)

  // Hard-cap both fields at the word limit — typing or pasting past it just
  // drops the overflow instead of letting the count climb past the limit.
  function handleTitleChange(value: string) {
    setTitle(truncateToWords(value, TITLE_WORD_LIMIT))
  }

  function handleStructureChange(value: string) {
    setStructure(truncateToWords(value, STRUCTURE_WORD_LIMIT))
  }

  function handleContinue() {
    if (!title.trim()) return
    setShowStructure(true)
  }

  async function handleGenerate() {
    if (!title.trim() || !structure.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch("/api/own-idea/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          structure: structure.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to generate")
      // Keep the loading state up through navigation to the detail page.
      router.push(`/idea/${data.ideaId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setIsGenerating(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div className="h-12 w-12 rounded-full border-2 border-[rgba(124,58,237,0.25)] border-t-[#7C3AED] animate-spin" />
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] font-semibold text-[#1A1A1A]">
            Building your idea…
          </p>
          <p className="text-[13px] text-[#9CA3AF] max-w-sm">
            We&apos;re turning your idea into a full breakdown you can generate content from.
          </p>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 self-start text-[12px] font-medium text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2.2} />
        Back to dashboard
      </Link>

      <div className="flex flex-col gap-2">
        <span className="self-start inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide text-[#7C3AED] bg-[rgba(124,58,237,0.08)]">
          <Pencil size={11} strokeWidth={2.2} />
          Your own idea
        </span>
        <h1 className="text-[26px] font-bold text-[#0A0A0A] leading-[1.3] tracking-[-0.01em]">
          What&apos;s your idea about?
        </h1>
        <p className="text-[14px] text-[#6B7280] leading-[1.55]">
          Already know what you want to post? Start with a title and we&apos;ll take it from there.
        </p>
      </div>

      {/* ── Step A — Title ─────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-[#374151]">
            Give your idea a title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            placeholder="e.g. 5 mistakes founders make when hiring their first team"
            className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[14px] text-[#0A0A0A] leading-[1.6] placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
          />
          <p
            className={[
              "text-[11px] tabular-nums self-end",
              titleWordCount >= TITLE_WORD_LIMIT ? "text-[#D97706] font-medium" : "text-[#ADA99F]",
            ].join(" ")}
          >
            {titleWordCount} / {TITLE_WORD_LIMIT} words
          </p>
        </div>

        {!showStructure && (
          <button
            onClick={handleContinue}
            disabled={!title.trim()}
            className={[
              "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
              title.trim()
                ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.28)]"
                : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
            ].join(" ")}
          >
            Continue
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        )}

        {/* ── Step B — Structure ─────────────────────────────────── */}
        {showStructure && (
          <>
            <div className="flex flex-col gap-2">
              <h2 className="text-[16px] font-semibold text-[#0A0A0A]">
                Tell us more about your idea
              </h2>
              <textarea
                value={structure}
                onChange={(e) => handleStructureChange(e.target.value)}
                rows={8}
                autoFocus
                placeholder="Describe your idea, key points, main argument, examples..."
                className="w-full px-4 py-3 rounded-xl border border-[#E5E3DE] bg-[#F4F2EC] text-[14px] text-[#0A0A0A] leading-[1.6] resize-none placeholder:text-[#ADA99F] focus:outline-none focus:border-[rgba(124,58,237,0.5)] transition-colors"
              />
              <p
                className={[
                  "text-[11px] tabular-nums self-end",
                  wordCount >= STRUCTURE_WORD_LIMIT ? "text-[#D97706] font-medium" : "text-[#ADA99F]",
                ].join(" ")}
              >
                {wordCount} / {STRUCTURE_WORD_LIMIT} words
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!structure.trim()}
              className={[
                "self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all",
                structure.trim()
                  ? "bg-[#7C3AED] hover:bg-[#6D28D9] cursor-pointer shadow-[0_0_24px_rgba(124,58,237,0.28)]"
                  : "bg-[rgba(124,58,237,0.3)] cursor-not-allowed opacity-50",
              ].join(" ")}
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" strokeWidth={2} />
              ) : (
                <Sparkles size={14} strokeWidth={2} />
              )}
              Generate →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
