"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Pencil, AlertCircle } from "lucide-react"
import { countWords, truncateToWords } from "@/lib/wordCount"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const TITLE_WORD_LIMIT = 15
const STRUCTURE_WORD_LIMIT = 650

/** "n / limit words" under a field; turns amber at the limit. */
function WordCount({ id, count, limit }: { id: string; count: number; limit: number }) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        "self-end text-caption tabular-nums",
        count >= limit ? "font-medium text-warning" : "text-muted-foreground"
      )}
    >
      {count} / {limit} words
    </p>
  )
}

/** Step number beside each part of the form. */
function StepMark({ n, done }: { n: number; done?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-semibold tabular-nums",
        done ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground"
      )}
    >
      {n}
    </span>
  )
}

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

      // Read as text first — a slow generation can run past an infrastructure
      // gateway timeout, which returns an HTML error page instead of JSON.
      // Blindly calling res.json() on that surfaces a confusing "Unexpected
      // token '<'" parse error instead of a usable message.
      const raw = await res.text()
      let data: { ideaId?: string; error?: string }
      try {
        data = JSON.parse(raw)
      } catch {
        console.error("[own-idea] Non-JSON response:", res.status, raw.slice(0, 200))
        throw new Error("Generation is taking longer than expected. Please try again.")
      }

      if (!res.ok) throw new Error(data.error ?? "Failed to generate")
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
      <div
        role="status"
        className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-5 text-center"
      >
        <div className="size-12 animate-spin rounded-full border-2 border-brand/25 border-t-brand motion-reduce:animate-none" aria-hidden />
        <div className="flex flex-col gap-1.5">
          <p className="text-body-lg font-semibold text-foreground">
            Building your idea…
          </p>
          <p className="max-w-sm text-label text-muted-foreground">
            We&apos;re turning your idea into a full breakdown you can generate content from.
          </p>
        </div>
      </div>
    )
  }

  // ── Form ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 self-start rounded-detail text-caption font-medium text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to dashboard
      </Link>

      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-brand">
          <Pencil className="size-3" aria-hidden />
          Your own idea
        </span>
        <h1 className="text-title-sm font-semibold text-balance md:text-title">
          What&apos;s your idea about?
        </h1>
        <p className="text-body text-muted-foreground">
          Already know what you want to post? Start with a title and we&apos;ll take it from there.
        </p>
      </div>

      <ol className="flex flex-col">
        {/* ── Step A — Title ─────────────────────────────────────── */}
        <li className="relative flex gap-4 pb-8">
          {/* Rail joining the two steps */}
          <span aria-hidden className="absolute top-8 bottom-1 left-3.5 w-px bg-border" />
          <StepMark n={1} done={showStructure} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="own-idea-title" className="pt-0.5 text-label font-semibold text-foreground">
              Give your idea a title
            </label>
            <Input
              id="own-idea-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              placeholder="e.g. 5 mistakes founders make when hiring their first team"
              aria-describedby="own-idea-title-count"
            />
            <WordCount id="own-idea-title-count" count={titleWordCount} limit={TITLE_WORD_LIMIT} />

            {!showStructure && (
              <Button onClick={handleContinue} disabled={!title.trim()} className="self-start">
                Continue
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </li>

        {/* ── Step B — Structure ─────────────────────────────────── */}
        <li className="flex gap-4">
          <StepMark n={2} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2
              className={cn(
                "pt-0.5 text-label font-semibold",
                showStructure ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {showStructure ? (
                <label htmlFor="own-idea-structure">Tell us more about your idea</label>
              ) : (
                "Tell us more about your idea"
              )}
            </h2>
            {showStructure && (
              <>
                <Textarea
                  id="own-idea-structure"
                  value={structure}
                  onChange={(e) => handleStructureChange(e.target.value)}
                  rows={8}
                  autoFocus
                  placeholder="Describe your idea, key points, main argument, examples..."
                  aria-describedby="own-idea-structure-count"
                  className="min-h-48 resize-y leading-relaxed"
                />
                <WordCount id="own-idea-structure-count" count={wordCount} limit={STRUCTURE_WORD_LIMIT} />

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-control border border-danger/25 bg-danger-soft px-4 py-3 text-label text-danger"
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {error}
                  </div>
                )}

                <Button variant="brand" size="lg" onClick={handleGenerate} disabled={!structure.trim()} className="mt-2 self-start">
                  {isGenerating ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Sparkles aria-hidden />
                  )}
                  Generate →
                </Button>
              </>
            )}
          </div>
        </li>
      </ol>
    </div>
  )
}
