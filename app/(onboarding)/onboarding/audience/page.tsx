"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"
import { WordLimitedField } from "@/components/WordLimitedField"
import { controlClasses } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const SENIORITY = [
  "Entry-level",
  "Mid-level",
  "Senior",
  "Manager",
  "Director",
  "Executive / C-suite",
]

export default function AudiencePage() {
  const router = useRouter()
  const audienceRole = useOnboardingStore((s) => s.audienceRole)
  const audienceSeniority = useOnboardingStore((s) => s.audienceSeniority)
  const audienceIndustry = useOnboardingStore((s) => s.audienceIndustry)
  const coreProblem = useOnboardingStore((s) => s.coreProblem)
  const setAudienceRole = useOnboardingStore((s) => s.setAudienceRole)
  const setAudienceSeniority = useOnboardingStore((s) => s.setAudienceSeniority)
  const setAudienceIndustry = useOnboardingStore((s) => s.setAudienceIndustry)
  const setCoreProblem = useOnboardingStore((s) => s.setCoreProblem)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const next = () => router.push("/onboarding/goals")

  const missingFields = [
    !audienceRole && "their job role",
    !audienceSeniority && "their seniority level",
    !audienceIndustry.trim() && "their industry",
    !coreProblem.trim() && "the core problem they face",
  ].filter((f): f is string => !!f)
  const canContinue = missingFields.length === 0
  const highlight = (missing: boolean) => attemptedSubmit && missing
  const validationMessage =
    missingFields.length > 0
      ? `Please fill in ${missingFields.length === 1 ? missingFields[0] : missingFields.slice(0, -1).join(", ") + " and " + missingFields[missingFields.length - 1]} to continue.`
      : ""

  const field = cn(controlClasses, "h-12 px-4")

  return (
    <div>
      <h1 className="text-title-sm font-semibold">Who are you writing for?</h1>
      <p className="mt-1 mb-8 text-body text-muted-foreground">
        Define your ideal reader so we can shape your content&apos;s angle.
      </p>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audience-role" className="text-label font-medium">
            Their Job Role
          </label>
          <WordLimitedField
            as="input"
            id="audience-role"
            invalid={highlight(!audienceRole)}
            value={audienceRole}
            onChange={setAudienceRole}
            maxWords={5}
            warnWithin={2}
            placeholder="e.g. Marketing Manager, CTO, Founder…"
            className={field}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p id="audience-seniority" className="text-label font-medium">
            Seniority Level
          </p>
          <div
            role="group"
            aria-labelledby="audience-seniority"
            className={cn("-m-1 flex flex-wrap gap-2 rounded-card p-1", highlight(!audienceSeniority) && "ring-2 ring-danger")}
          >
            {SENIORITY.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={audienceSeniority === opt}
                onClick={() => setAudienceSeniority(audienceSeniority === opt ? "" : opt)}
                className="h-10 rounded-full border border-border bg-surface px-4 text-label text-foreground transition-colors hover:border-control-border aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="audience-industry" className="text-label font-medium">
            Their Industry
          </label>
          <WordLimitedField
            as="input"
            id="audience-industry"
            invalid={highlight(!audienceIndustry.trim())}
            value={audienceIndustry}
            onChange={setAudienceIndustry}
            maxWords={5}
            warnWithin={2}
            placeholder="e.g. B2B SaaS, Healthcare, Finance…"
            className={field}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="audience-problem" className="text-label font-medium">
            Core Problem They Face
          </label>
          <WordLimitedField
            as="textarea"
            id="audience-problem"
            invalid={highlight(!coreProblem.trim())}
            value={coreProblem}
            onChange={setCoreProblem}
            maxWords={200}
            rows={3}
            placeholder="e.g. Struggling to generate leads on LinkedIn, building a brand without time…"
            className={cn(controlClasses, "resize-none px-4 py-3")}
          />
        </div>
      </div>

      <StepNav
        backHref="/onboarding/topics"
        onContinue={next}
        canContinue={canContinue}
        validationMessage={validationMessage}
        onInvalid={() => setAttemptedSubmit(true)}
      />
    </div>
  )
}
