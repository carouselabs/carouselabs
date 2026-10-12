"use client"

import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"
import { cn } from "@/lib/utils"

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

  const makePrimary = (id: string) => {
    if (goals.includes(id)) setPrimaryGoal(id)
  }

  const next = () => router.push("/onboarding/voice")

  return (
    <div>
      <h1 id="goals-title" className="text-title-sm font-semibold">What are your content goals?</h1>
      <p className="mt-1 mb-8 text-body text-muted-foreground">
        Select all that apply. Tap a selected goal to mark it as primary.
      </p>

      <ul aria-labelledby="goals-title" className="flex flex-col gap-2.5">
        {GOALS.map((goal) => {
          const selected = goals.includes(goal.id)
          const isPrimary = primaryGoal === goal.id
          return (
            <li
              key={goal.id}
              data-selected={selected || undefined}
              className="flex items-stretch overflow-hidden rounded-card border border-border bg-surface transition-colors hover:border-control-border data-selected:border-brand data-selected:bg-brand-soft/50 data-selected:shadow-[inset_0_0_0_1px_var(--brand)]"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(goal.id)}
                className="flex min-w-0 flex-1 items-start gap-4 px-5 py-4 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium text-foreground">{goal.label}</span>
                    {isPrimary && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-caption font-medium text-primary-foreground">
                        Primary
                      </span>
                    )}
                  </span>
                  <span className="text-label text-muted-foreground">{goal.description}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                    selected ? "border-brand bg-brand text-brand-foreground" : "border-control-border bg-surface"
                  )}
                >
                  {selected && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
              {selected && !isPrimary && (
                <button
                  type="button"
                  onClick={() => makePrimary(goal.id)}
                  className="shrink-0 border-l border-border px-4 text-label font-medium text-brand transition-colors hover:bg-brand-soft"
                >
                  Set primary
                </button>
              )}
            </li>
          )
        })}
      </ul>

      <StepNav
        backHref="/onboarding/audience"
        onContinue={next}
        canContinue={!!primaryGoal}
        validationMessage="Please select at least one content goal, or tap Skip to continue."
        showSkip
        onSkip={next}
      />
    </div>
  )
}
