"use client"

import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"

const GOALS = [
  {
    id: "brand",
    label: "Build personal brand",
    description: "Become the go-to voice in your niche",
    emoji: "🌟",
  },
  {
    id: "leads",
    label: "Generate leads & clients",
    description: "Turn followers into paying customers",
    emoji: "💰",
  },
  {
    id: "followers",
    label: "Grow my audience",
    description: "Increase reach and follower count",
    emoji: "📈",
  },
  {
    id: "thought-leadership",
    label: "Establish thought leadership",
    description: "Be seen as a credible industry expert",
    emoji: "🎓",
  },
  {
    id: "educate",
    label: "Educate my audience",
    description: "Share knowledge and help others level up",
    emoji: "📚",
  },
]

export default function GoalsPage() {
  const router = useRouter()
  const goals = useOnboardingStore((s) => s.goals)
  const primaryGoal = useOnboardingStore((s) => s.primaryGoal)
  const setGoals = useOnboardingStore((s) => s.setGoals)
  const setPrimaryGoal = useOnboardingStore((s) => s.setPrimaryGoal)

  const toggle = (id: string) => {
    if (goals.includes(id)) {
      const next = goals.filter((g) => g !== id)
      setGoals(next)
      if (primaryGoal === id) setPrimaryGoal(next[0] ?? "")
    } else {
      const next = [...goals, id]
      setGoals(next)
      if (!primaryGoal) setPrimaryGoal(id)
    }
  }

  const makePrimary = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (goals.includes(id)) setPrimaryGoal(id)
  }

  const next = () => router.push("/onboarding/voice")

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#F0F0FA] mb-1">What are your content goals?</h1>
      <p className="text-sm text-[rgba(255,255,255,0.45)] mb-8">
        Select all that apply. Tap a selected goal to mark it as primary.
      </p>

      <div className="flex flex-col gap-2.5">
        {GOALS.map((goal) => {
          const selected = goals.includes(goal.id)
          const isPrimary = primaryGoal === goal.id
          return (
            <div
              key={goal.id}
              onClick={() => toggle(goal.id)}
              className={`flex items-start gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-all ${
                selected
                  ? "border-[#7C3AED] bg-[rgba(124,58,237,0.08)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.14)]"
              }`}
            >
              <span className="text-xl mt-0.5 select-none">{goal.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${selected ? "text-[#F0F0FA]" : "text-[rgba(255,255,255,0.65)]"}`}>
                    {goal.label}
                  </p>
                  {isPrimary && (
                    <span className="px-2 py-0.5 rounded-full bg-[rgba(124,58,237,0.2)] border border-[rgba(124,58,237,0.3)] text-[#A78BFA] text-[10px] font-medium leading-none py-1">
                      Primary
                    </span>
                  )}
                  {selected && !isPrimary && (
                    <button
                      onClick={(e) => makePrimary(goal.id, e)}
                      className="text-[10px] text-[rgba(255,255,255,0.3)] hover:text-[rgba(167,139,250,0.7)] transition-colors"
                    >
                      Set primary
                    </button>
                  )}
                </div>
                <p className="text-xs text-[rgba(255,255,255,0.35)] mt-0.5">{goal.description}</p>
              </div>
              {selected && (
                <div className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <StepNav
        backHref="/onboarding/audience"
        onContinue={next}
        canContinue={!!primaryGoal}
        showSkip
        onSkip={next}
      />
    </div>
  )
}
