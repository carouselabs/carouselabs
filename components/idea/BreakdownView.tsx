"use client"

import { useEffect, useState } from "react"
import {
  Zap,
  Target,
  Heart,
  AlignLeft,
  List,
  Mic2,
  ArrowRight,
  FileText,
  ImageIcon,
  TrendingUp,
  Flag,
  Newspaper,
} from "lucide-react"
import type { BreakdownOutline } from "@/lib/types/breakdown"

const SECTIONS: {
  key: keyof BreakdownOutline
  label: string
  icon: React.ElementType
}[] = [
  { key: "refinedHook", label: "Refined Hook", icon: Zap },
  // deepDive is rendered separately above the grid
  { key: "postObjective", label: "Post Objective", icon: Target },
  { key: "targetEmotion", label: "Target Emotion", icon: Heart },
  { key: "recommendedStructure", label: "Recommended Structure", icon: AlignLeft },
  { key: "keyTalkingPoints", label: "Key Talking Points", icon: List },
  { key: "storytellingAngle", label: "Storytelling Angle", icon: Mic2 },
  { key: "suggestedCTA", label: "Suggested CTA", icon: ArrowRight },
  { key: "recommendedFormat", label: "Recommended Format", icon: FileText },
  { key: "visualIdea", label: "Visual Idea", icon: ImageIcon },
  { key: "engagementTips", label: "Engagement Tips", icon: TrendingUp },
  { key: "strongEndingLine", label: "Strong Ending Line", icon: Flag },
]

interface BreakdownViewProps {
  ideaId: string
  initialBreakdown: BreakdownOutline | null
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

  // Split deepDive into paragraphs on double-newlines or single newlines
  const deepDiveParagraphs = breakdown.deepDive
    ? breakdown.deepDive
        .split(/\n{2,}|\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* ── Deep Dive ─────────────────────────────────────────── */}
      {deepDiveParagraphs.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[rgba(147,197,253,0.1)] border border-[rgba(147,197,253,0.2)] flex items-center justify-center flex-shrink-0">
              <Newspaper size={13} className="text-[#93C5FD]" strokeWidth={2} />
            </div>
            <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.35)] uppercase tracking-widest">
              Deep Dive
            </p>
          </div>

          <div className="px-5 py-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col gap-4">
            {deepDiveParagraphs.map((para, i) => (
              <p
                key={i}
                className="text-[14.5px] text-[rgba(255,255,255,0.7)] leading-[1.75] tracking-[-0.01em]"
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Breakdown ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-[12px] font-medium text-[rgba(255,255,255,0.28)] uppercase tracking-widest">
          Content Breakdown
        </p>
        {SECTIONS.map(({ key, label, icon: Icon }) => {
          const value = breakdown[key]
          if (!value || value === "N/A for text post") return null
          return (
            <div
              key={key}
              className="flex gap-3 px-4 py-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center mt-0.5">
                <Icon size={13} className="text-[#A78BFA]" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-semibold text-[rgba(255,255,255,0.35)] uppercase tracking-wider">
                  {label}
                </span>
                <p className="text-[13px] text-[rgba(255,255,255,0.75)] leading-[1.5]">
                  {value}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
