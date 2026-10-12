"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"
import { cn } from "@/lib/utils"

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
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

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
  const missingTopics = attemptedSubmit && !canContinue

  return (
    <div>
      <h1 id="topics-title" className="text-title-sm font-semibold">What do you post about?</h1>
      <p id="topics-hint" className="mt-1 mb-8 text-body text-muted-foreground">
        Type your own topics or pick {MIN}+ from the suggestions below.
      </p>

      <div
        className={cn(
          "mb-2 flex min-h-28 cursor-text flex-wrap content-start gap-2 rounded-card border bg-surface p-3 transition-colors focus-within:border-brand",
          missingTopics ? "border-danger" : "border-control-border"
        )}
        onClick={() => document.getElementById("tag-input")?.focus()}
      >
        {topics.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-primary pr-1 pl-3.5 text-label text-primary-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => {
                e.stopPropagation()
                removeTopic(tag)
              }}
              className="grid size-7 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        {topics.length < MAX && (
          <input
            id="tag-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            aria-labelledby="topics-title"
            aria-describedby="topics-hint topics-count"
            aria-invalid={missingTopics || undefined}
            placeholder={topics.length === 0 ? "Type a topic, press Enter…" : ""}
            className="h-9 min-w-[160px] flex-1 bg-transparent px-1 text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      <p id="topics-count" className="mb-8 text-caption text-muted-foreground tabular-nums">
        {topics.length}/{MAX} · type 1 custom topic or pick {MIN}+ from below
      </p>

      <div>
        <p className="mb-3 text-label font-medium text-muted-foreground">
          Suggestions
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !topics.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTopic(s, false)}
              disabled={topics.length >= MAX}
              className="h-9 rounded-full border border-border bg-surface px-3.5 text-label text-foreground transition-colors hover:border-control-border hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
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
        validationMessage={`Please add at least ${MIN} topics (or type 1 of your own) to continue.`}
        onInvalid={() => setAttemptedSubmit(true)}
      />
    </div>
  )
}
