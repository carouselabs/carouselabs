"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"

const SUGGESTIONS = [
  "Leadership",
  "Personal Branding",
  "Entrepreneurship",
  "Marketing Strategy",
  "Productivity",
  "Career Growth",
  "AI & Technology",
  "Sales",
  "Remote Work",
  "Company Culture",
  "Fundraising",
  "Content Creation",
]

const MIN = 3
const MAX = 7

export default function TopicsPage() {
  const router = useRouter()
  const topics = useOnboardingStore((s) => s.topics)
  const setTopics = useOnboardingStore((s) => s.setTopics)
  const [input, setInput] = useState("")
  const [manualTopics, setManualTopics] = useState<string[]>([])

  const addTopic = (tag: string, isManual: boolean) => {
    const t = tag.trim()
    if (!t || topics.includes(t) || topics.length >= MAX) return
    setTopics([...topics, t])
    if (isManual) setManualTopics((prev) => [...prev, t])
    setInput("")
  }

  const removeTopic = (tag: string) => {
    setTopics(topics.filter((t) => t !== tag))
    setManualTopics((prev) => prev.filter((t) => t !== tag))
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTopic(input, true)
    }
    if (e.key === "Backspace" && !input && topics.length) {
      removeTopic(topics[topics.length - 1])
    }
  }

  const presetCount = topics.length - manualTopics.length
  const canContinue = manualTopics.length >= 1 || presetCount >= MIN

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#F0F0FA] mb-1">What do you post about?</h1>
      <p className="text-sm text-[rgba(255,255,255,0.45)] mb-8">
        Type your own topics or pick {MIN}+ from the suggestions below.
      </p>

      <div
        className="min-h-[112px] p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2 cursor-text focus-within:border-[#7C3AED] transition-colors mb-2"
        onClick={() => document.getElementById("tag-input")?.focus()}
      >
        {topics.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(124,58,237,0.16)] border border-[rgba(124,58,237,0.25)] text-[#A78BFA] text-sm"
          >
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeTopic(tag)
              }}
              className="text-[rgba(167,139,250,0.55)] hover:text-[#A78BFA] transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {topics.length < MAX && (
          <input
            id="tag-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={topics.length === 0 ? "Type a topic, press Enter…" : ""}
            className="flex-1 min-w-[160px] bg-transparent text-[#F0F0FA] text-sm placeholder-[rgba(255,255,255,0.2)] outline-none"
          />
        )}
      </div>

      <p className="text-xs text-[rgba(255,255,255,0.28)] mb-7">
        {topics.length}/{MAX} · type 1 custom topic or pick {MIN}+ from below
      </p>

      <div>
        <p className="text-xs text-[rgba(255,255,255,0.35)] mb-3 uppercase tracking-wide font-medium">
          Suggestions
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !topics.includes(s)).map((s) => (
            <button
              key={s}
              onClick={() => addTopic(s, false)}
              disabled={topics.length >= MAX}
              className="px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)] text-sm text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.18)] hover:text-[rgba(255,255,255,0.8)] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <StepNav
        backHref="/onboarding/industry"
        onContinue={() => router.push("/onboarding/audience")}
        canContinue={canContinue}
      />
    </div>
  )
}
