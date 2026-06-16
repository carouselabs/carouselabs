"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"

const TONES = [
  {
    id: "professional",
    label: "Professional & Authoritative",
    description: "Credible, polished, data-backed",
    preview: "\"Our analysis of 500 B2B deals reveals three patterns most founders miss.\"",
  },
  {
    id: "conversational",
    label: "Conversational & Relatable",
    description: "Approachable, story-driven, human",
    preview: "\"I almost quit last Tuesday. Here's what stopped me.\"",
  },
  {
    id: "inspirational",
    label: "Inspirational & Motivational",
    description: "Energizing, visionary, empowering",
    preview: "\"Stop waiting for permission. Build the thing now. The world needs it.\"",
  },
  {
    id: "educational",
    label: "Educational & Informative",
    description: "Clear, structured, value-first",
    preview: "\"5 things no one tells you about scaling to $1M ARR:\"",
  },
  {
    id: "bold",
    label: "Bold & Provocative",
    description: "Contrarian, direct, opinion-heavy",
    preview: "\"Cold outreach is dead. The era of content-led growth is here.\"",
  },
]

export default function VoicePage() {
  const router = useRouter()
  const tones = useOnboardingStore((s) => s.tones)
  const setTones = useOnboardingStore((s) => s.setTones)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const toggle = (id: string) => {
    if (tones.includes(id)) {
      setTones(tones.filter((t) => t !== id))
    } else if (tones.length < 2) {
      setTones([...tones, id])
    }
  }

  const saveProfile = async (selectedTones: string[]) => {
    const s = useOnboardingStore.getState()
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: s.role,
        industry: s.industry,
        niche: s.niche,
        topics: s.topics,
        audienceRole: s.audienceRole,
        audienceSeniority: s.audienceSeniority,
        audienceIndustry: s.audienceIndustry,
        coreProblem: s.coreProblem,
        goals: s.goals,
        primaryGoal: s.primaryGoal,
        tones: selectedTones,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  const handleContinue = async () => {
    setLoading(true)
    setError("")
    try {
      await saveProfile(tones)
      router.push("/onboarding/completing")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    try {
      await saveProfile([])
    } catch {
      // non-blocking — proceed regardless
    }
    router.push("/onboarding/completing")
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-1">What's your content voice?</h1>
      <p className="text-sm text-[#6B7280] mb-8">
        Choose up to 2 tones that feel most like you.
      </p>

      <div className="flex flex-col gap-2.5">
        {TONES.map((tone) => {
          const selected = tones.includes(tone.id)
          const disabled = !selected && tones.length >= 2
          return (
            <button
              key={tone.id}
              onClick={() => toggle(tone.id)}
              disabled={disabled}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                selected
                  ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.08)]"
                  : disabled
                  ? "border-[#F1EFE9] bg-transparent opacity-35 cursor-not-allowed"
                  : "border-[#E5E3DE] bg-[#F6F4EE] hover:border-[#DEDBD4]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm font-medium ${selected ? "text-[#0A0A0A]" : "text-[#4B5563]"}`}>
                  {tone.label}
                </p>
                {selected && (
                  <span className="w-4 h-4 rounded-full bg-[#1A1A1A] flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#9CA3AF] mb-2">{tone.description}</p>
              <p className="text-xs text-[#9CA3AF] italic font-light">{tone.preview}</p>
            </button>
          )
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <StepNav
        backHref="/onboarding/goals"
        onContinue={handleContinue}
        canContinue={tones.length > 0}
        continueLabel="Finish"
        loading={loading}
        showSkip
        onSkip={handleSkip}
      />
    </div>
  )
}
