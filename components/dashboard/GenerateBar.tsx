"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GenerateBarProps {
  value: string
  onChange: (v: string) => void
  onGenerate: () => void
  isLoading: boolean
}

const FALLBACK = [
  "What's trending in my industry today",
  "Share a surprising fact with my audience",
  "A lesson I learned the hard way",
  "A common myth in my field, debunked",
  "Turn a recent win into a post",
]

const subscribeNothing = () => () => {}
function readCache() {
  try {
    return localStorage.getItem("ideaSuggestions")
  } catch {
    return null
  }
}
function parseCache(cached: string | null): string[] | null {
  try {
    const arr = cached ? JSON.parse(cached) : null
    return Array.isArray(arr) && arr.length ? arr : null
  } catch {
    return null
  }
}

/** The brief: a topic (optional), suggestions from the profile, and Generate. */
export function GenerateBar({ value, onChange, onGenerate, isLoading }: GenerateBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Seed from localStorage so there's no flash, then confirm/refresh from the
  // API (which only calls Claude when the profile changed). The cache is read
  // after hydration so the server and first client render agree.
  const cached = useSyncExternalStore(subscribeNothing, readCache, () => null)
  const [fresh, setFresh] = useState<string[] | null>(null)
  const suggestions = fresh ?? parseCache(cached) ?? FALLBACK

  useEffect(() => {
    let active = true
    fetch("/api/ideas/suggestions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { suggestions?: string[] } | null) => {
        if (!active || !data?.suggestions?.length) return
        setFresh(data.suggestions)
        try {
          localStorage.setItem("ideaSuggestions", JSON.stringify(data.suggestions))
        } catch {
          // ignore storage failures
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!isLoading) onGenerate()
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 self-start text-caption font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-brand" aria-hidden />
            Tailored to your profile
          </span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isLoading}
            placeholder="What do you want to post about?"
            aria-label="What do you want to post about?"
            aria-describedby="generate-hint"
            className="w-full min-w-0 border-b-2 border-control-border bg-transparent pb-2 text-lead font-semibold tracking-[-0.02em] text-foreground outline-none transition-colors duration-(--motion-fast) placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-brand disabled:opacity-60 md:text-title-sm"
          />
        </div>
        <Button type="submit" size="lg" disabled={isLoading} aria-busy={isLoading || undefined} className="disabled:cursor-not-allowed disabled:opacity-70">
          {isLoading ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles aria-hidden />}
          {isLoading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {/* Suggestions written for this profile — a tap fills the topic. */}
      <ul aria-label="Suggestions" className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {suggestions.slice(0, 5).map((s) => (
          <li key={s} className="shrink-0">
            <button
              type="button"
              disabled={isLoading}
              aria-pressed={value === s}
              onClick={() => {
                onChange(s)
                inputRef.current?.focus()
              }}
              title={s}
              className="inline-flex h-8 max-w-[18rem] items-center truncate rounded-full border border-border bg-surface px-3 text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground disabled:opacity-50 aria-pressed:border-foreground aria-pressed:text-foreground sm:max-w-[22rem]"
            >
              <span className="truncate">{s}</span>
            </button>
          </li>
        ))}
      </ul>

      <p id="generate-hint" className="text-caption text-muted-foreground">
        Not sure what to write?{" "}
        <span className="text-foreground">Leave it blank and we&apos;ll generate ideas for you.</span>
      </p>
    </form>
  )
}
