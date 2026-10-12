"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorNotice } from "@/components/create/CreateKit"
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
        <strong key={i} className="font-semibold text-foreground">
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
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-card border border-border bg-surface px-6 py-12 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-body-lg font-semibold text-foreground">
            That&apos;s not a content topic
          </h2>
          <p className="text-label text-muted-foreground">{invalidTopic}</p>
        </div>
        <Link href="/dashboard" className={buttonVariants()}>
          <ArrowLeft aria-hidden />
          Go back to dashboard
        </Link>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="flex max-w-reading flex-col gap-4">
        <p role="status" className="text-label text-muted-foreground">
          Generating breakdown…
        </p>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5 pt-3" aria-hidden>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-reading">
        <ErrorNotice message={friendlyGenerationError(error)} onRetry={generate} />
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
    <div className="flex max-w-reading flex-col gap-2">
      {deepDiveParagraphs.map((line, i) => {
        // Bold header: **Section Title**
        if (line.startsWith("**") && line.endsWith("**")) {
          const text = line.replace(/\*\*/g, "")
          return (
            <h2
              key={i}
              className="mt-8 mb-1 text-body-lg font-semibold text-foreground first:mt-0"
            >
              {text}
            </h2>
          )
        }
        // Bullet point: - item
        if (line.startsWith("- ")) {
          const text = line.slice(2)
          return (
            <div key={i} className="flex items-start gap-2.5 pl-1">
              <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-foreground/60" aria-hidden />
              <p className="text-body leading-relaxed text-foreground/85">
                {renderInline(text)}
              </p>
            </div>
          )
        }
        // Regular paragraph
        return (
          <p key={i} className="text-body leading-relaxed text-foreground/85">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}
