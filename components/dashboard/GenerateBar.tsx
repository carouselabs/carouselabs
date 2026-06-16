"use client"

import { useEffect, useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"

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

export function GenerateBar({ value, onChange, onGenerate, isLoading }: GenerateBarProps) {
  // Seed from localStorage so there's no flash, then confirm/refresh from the
  // API (which only calls Claude when the profile changed).
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    if (typeof window === "undefined") return FALLBACK
    try {
      const cached = localStorage.getItem("ideaSuggestions")
      const arr = cached ? JSON.parse(cached) : null
      return Array.isArray(arr) && arr.length ? arr : FALLBACK
    } catch {
      return FALLBACK
    }
  })

  useEffect(() => {
    let active = true
    fetch("/api/ideas/suggestions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { suggestions?: string[] } | null) => {
        if (!active || !data?.suggestions?.length) return
        setSuggestions(data.suggestions)
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

  // ── Streaming typewriter placeholder ──
  const [typed, setTyped] = useState("")
  const [idx, setIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrases = suggestions.length ? suggestions : FALLBACK
    const current = phrases[idx % phrases.length]
    let t: ReturnType<typeof setTimeout>

    if (!deleting && typed === current) {
      t = setTimeout(() => setDeleting(true), 1800)
    } else if (deleting && typed === "") {
      t = setTimeout(() => {
        setDeleting(false)
        setIdx((i) => (i + 1) % phrases.length)
      }, 350)
    } else {
      t = setTimeout(
        () =>
          setTyped((prev) =>
            deleting ? prev.slice(0, -1) : current.slice(0, prev.length + 1),
          ),
        deleting ? 28 : 50,
      )
    }

    return () => clearTimeout(t)
  }, [typed, deleting, idx, suggestions])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !isLoading) onGenerate()
  }

  const placeholder = value.length === 0 ? typed : "What do you want to post about?"

  return (
    <div className="flex flex-col gap-2">
    <div className="rounded-2xl border border-[#E5E3DE] bg-[#FFFDF8] shadow-[0_10px_30px_rgba(10,10,10,0.05)] p-4 focus-within:border-[rgba(26,26,26,0.4)] transition-colors">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={placeholder}
        aria-label="What do you want to post about?"
        className="w-full bg-transparent text-[15px] text-[#0A0A0A] placeholder:text-[#9CA3AF] outline-none disabled:opacity-60"
      />

      <div className="flex items-center justify-between gap-3 mt-3">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E5E3DE] bg-[#F9F7F2] text-[11px] font-medium text-[#6B7280]">
          <Sparkles size={11} strokeWidth={2} />
          Tailored to your profile
        </span>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-5 h-9 rounded-lg bg-[#1A1A1A] hover:bg-black text-white text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Sparkles size={15} strokeWidth={2.2} />
          )}
          {isLoading ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>

      <p className="text-[12px] text-[#9CA3AF] pl-1.5">
        Not sure what to write?{" "}
        <span className="text-[#6B7280]">Leave it blank and we&apos;ll generate ideas for you.</span>
      </p>
    </div>
  )
}
