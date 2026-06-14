"use client"

import { useEffect, useState } from "react"
import type { BreakdownOutline } from "@/lib/types/breakdown"

interface BreakdownViewProps {
  ideaId: string
  initialBreakdown: BreakdownOutline | null
}

// Render inline **bold** segments inside a line as actual bold text.
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[rgba(255,255,255,0.9)]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export function BreakdownView({ ideaId, initialBreakdown }: BreakdownViewProps) {
  const [breakdown, setBreakdown] = useState<BreakdownOutline | null>(initialBreakdown)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialBreakdown) return
    generate()
  }, [ideaId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/ideas/${ideaId}/breakdown`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate breakdown")
      setBreakdown(data.breakdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-[rgba(255,255,255,0.28)] mb-1">
          Generating breakdown…
        </p>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] animate-pulse"
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
          {error}
        </div>
        <button
          onClick={generate}
          className="self-start text-[13px] font-medium text-[#A78BFA] hover:text-[#C4B5FD] transition-colors"
        >
          Try again
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
              className="text-[17px] font-bold text-[rgba(255,255,255,0.9)] mt-6 mb-2"
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
              <span className="text-[#7C3AED] mt-1 flex-shrink-0">•</span>
              <p className="text-[15px] text-[rgba(255,255,255,0.72)] leading-[1.7]">
                {renderInline(text)}
              </p>
            </div>
          )
        }
        // Regular paragraph
        return (
          <p key={i} className="text-[15px] text-[rgba(255,255,255,0.72)] leading-[1.7]">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}
