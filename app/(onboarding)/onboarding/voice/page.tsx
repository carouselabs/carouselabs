"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"
import { OptionCardCheckbox } from "@/components/patterns/OptionCard"

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
      <h1 id="voice-title" className="text-title-sm font-semibold">What&apos;s your content voice?</h1>
      <p className="mt-1 mb-8 text-body text-muted-foreground">
        Choose up to 2 tones that feel most like you.
      </p>

      <div role="group" aria-labelledby="voice-title" className="flex flex-col gap-2.5">
        {TONES.map((tone) => {
          const selected = tones.includes(tone.id)
          const disabled = !selected && tones.length >= 2
          return (
            <OptionCardCheckbox
              key={tone.id}
              checked={selected}
              onCheckedChange={() => toggle(tone.id)}
              disabled={disabled}
              layout="row"
              title={tone.label}
              description={tone.description}
              extra={<span className="mt-1 text-label text-muted-foreground italic">{tone.preview}</span>}
            />
          )
        })}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-label font-medium text-danger">
          {error}
        </p>
      )}

      <StepNav
        backHref="/onboarding/goals"
        onContinue={handleContinue}
        canContinue={tones.length > 0}
        continueLabel="Finish"
        loading={loading}
        validationMessage="Please select at least one tone, or tap Skip to continue."
        showSkip
        onSkip={handleSkip}
      />
    </div>
  )
}
