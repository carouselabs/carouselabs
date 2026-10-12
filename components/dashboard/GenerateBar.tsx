"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Check, CornerDownLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GenerateBarProps {
  value: string
  onChange: (v: string) => void
  onGenerate: () => void
  isLoading: boolean
  /** "hero": the first screen — a headline-sized topic and the suggestions as a list. "bar": above the idea feed. */
  variant?: "hero" | "bar"
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
export function GenerateBar({ value, onChange, onGenerate, isLoading, variant = "bar" }: GenerateBarProps) {
  const hero = variant === "hero"
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

  const pick = (s: string) => {
    onChange(s)
    inputRef.current?.focus()
  }

  return (
    <form
      className={cn("flex flex-col", hero ? "gap-7" : "gap-4")}
      onSubmit={(e) => {
        e.preventDefault()
        if (!isLoading) onGenerate()
      }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          placeholder="What do you want to post about?"
          aria-label="What do you want to post about?"
          aria-describedby="generate-hint"
          className={cn(
            "w-full min-w-0 flex-1 border-b border-control-border bg-transparent font-display text-foreground outline-none! transition-[border-color,box-shadow] duration-(--motion-fast) placeholder:text-muted-foreground/80 focus-visible:border-brand focus-visible:shadow-[0_1px_0_var(--brand)] disabled:opacity-60",
            hero ? "pb-3 text-[1.375rem] leading-tight sm:text-[2rem] md:text-[2.5rem]" : "pb-2 text-[1.375rem] leading-tight sm:text-[1.625rem] md:text-[1.875rem]"
          )}
        />
        <Button type="submit" size="lg" disabled={isLoading} aria-busy={isLoading || undefined} className="disabled:cursor-not-allowed disabled:opacity-70">
          {isLoading && <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {isLoading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {/* Suggestions written for this profile — a tap fills the topic. */}
      {hero ? (
        <div className="flex flex-col gap-2">
          <p id="generate-suggestions" className="text-caption font-medium text-muted-foreground">
            Tailored to your profile
          </p>
          <ul aria-labelledby="generate-suggestions" className="grid border-t border-border md:grid-cols-2 md:gap-x-8">
            {suggestions.slice(0, 5).map((s) => (
              <li key={s} className="border-b border-border">
                <button
                  type="button"
                  disabled={isLoading}
                  aria-pressed={value === s}
                  onClick={() => pick(s)}
                  className="group/s flex min-h-11 w-full items-center gap-3 py-2 text-left text-label text-muted-foreground transition-colors duration-(--motion-fast) hover:text-foreground disabled:opacity-50 aria-pressed:text-foreground"
                >
                  <span aria-hidden className="h-4 w-0.5 shrink-0 rounded-full bg-border transition-colors duration-(--motion-fast) group-hover/s:bg-control-border group-aria-pressed/s:bg-brand" />
                  <span className="min-w-0 flex-1">{s}</span>
                  <CornerDownLeft
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-(--motion-fast) group-hover/s:opacity-100 group-focus-visible/s:opacity-100 group-aria-pressed/s:hidden"
                  />
                  <Check aria-hidden className="hidden size-3.5 shrink-0 text-brand group-aria-pressed/s:block" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <p id="generate-suggestions" className="shrink-0 text-caption font-medium text-muted-foreground">
            Tailored to your profile
          </p>
          <ul aria-labelledby="generate-suggestions" className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {suggestions.slice(0, 5).map((s) => (
              <li key={s} className="shrink-0">
                <button
                  type="button"
                  disabled={isLoading}
                  aria-pressed={value === s}
                  onClick={() => pick(s)}
                  title={s}
                  className="inline-flex h-8 max-w-[18rem] items-center truncate rounded-full border border-border bg-surface px-3 text-caption text-muted-foreground transition-colors duration-(--motion-fast) hover:border-control-border hover:text-foreground disabled:opacity-50 aria-pressed:border-foreground aria-pressed:text-foreground sm:max-w-[22rem]"
                >
                  <span className="truncate">{s}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p id="generate-hint" className="text-caption text-muted-foreground">
        Not sure what to write?{" "}
        <span className="text-foreground">Leave it blank and we&apos;ll generate ideas for you.</span>
      </p>
    </form>
  )
}
