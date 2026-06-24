"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, ArrowLeft } from "lucide-react"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import { friendlyGenerationError } from "@/lib/friendlyError"

interface BreakdownViewProps {
  ideaId: string
  initialBreakdown: BreakdownOutline | null
  // Notifies the parent while the breakdown is (re)generating so sibling UI
  // (e.g. the format picker) can disable itself.
  onGeneratingChange?: (generating: boolean) => void
}

// Render inline **bold** segments inside a line as actual bold text.
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[#0A0A0A]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function BreakdownView({ ideaId, initialBreakdown, onGeneratingChange }: BreakdownViewProps) {
  const [breakdown, setBreakdown] = useState<BreakdownOutline | null>(initialBreakdown)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invalidTopic, setInvalidTopic] = useState<string | null>(null)

  useEffect(() => {
    if (initialBreakdown) return
    generate()
  }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setIsGenerating(true)
    onGeneratingChange?.(true)
    setError(null)
    setInvalidTopic(null)
    try {
      const res = await fetch(`/api/ideas/${ideaId}/breakdown`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        // Off-topic / general-assistant misuse → show the friendly guard card.
        if (data.invalidTopic) {
          setInvalidTopic(data.error ?? "This isn't a social media content topic.")
          return
        }
        throw new Error(data.error ?? "Failed to generate breakdown")
      }
      setBreakdown(data.breakdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
      onGeneratingChange?.(false)
    }
  }

  if (invalidTopic) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center text-center gap-5 py-12">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(26,26,26,0.06)] border border-[rgba(26,26,26,0.16)] flex items-center justify-center">
          <Sparkles size={24} className="text-[#1A1A1A]" strokeWidth={1.8} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-[18px] font-semibold text-[#0A0A0A]">
            That&apos;s not a content topic
          </h2>
          <p className="text-[14px] text-[#6B7280] leading-[1.6]">{invalidTopic}</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-black text-white text-[13px] font-semibold transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
        >
          <ArrowLeft size={15} strokeWidth={2.2} />
          Go back to dashboard
        </Link>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-[#ADA99F] mb-1">
          Generating breakdown…
        </p>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] rounded-xl bg-[#F6F4EE] border border-[#F1EFE9] animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[13px] text-[rgba(239,68,68,0.9)]">
          {friendlyGenerationError(error)}
        </div>
        <button
          onClick={generate}
          className="self-start text-[13px] font-medium text-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!breakdown) return null

  // Split deepDive into lines (drop blank lines — section headers carry their
  // own top spacing).
  const deepDiveParagraphs = breakdown.deepDive
    ? breakdown.deepDive
        .split(/\n{2,}|\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  if (deepDiveParagraphs.length === 0) return null

  // Render the deep dive as markdown: **bold** headers, - bullet lists, and
  // normal paragraphs — at a comfortable reading width.
  return (
    <div className="flex flex-col gap-1.5 max-w-[680px]">
      {deepDiveParagraphs.map((line, i) => {
        // Bold header: **Section Title**
        if (line.startsWith("**") && line.endsWith("**")) {
          const text = line.replace(/\*\*/g, "")
          return (
            <h3
              key={i}
              className="text-[17px] font-bold text-[#0A0A0A] mt-6 mb-2"
            >
              {text}
            </h3>
          )
        }
        // Bullet point: - item
        if (line.startsWith("- ")) {
          const text = line.slice(2)
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#1A1A1A] mt-1 flex-shrink-0">•</span>
              <p className="text-[15px] text-[#374151] leading-[1.7]">
                {renderInline(text)}
              </p>
            </div>
          )
        }
        // Regular paragraph
        return (
          <p key={i} className="text-[15px] text-[#374151] leading-[1.7]">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}
