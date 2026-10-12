"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"
import { OptionCard, OptionCardGroup } from "@/components/patterns/OptionCard"
import { cn } from "@/lib/utils"

const ROLES = [
  { id: "founder", label: "Founder / Entrepreneur", emoji: "🚀" },
  { id: "creator", label: "Content Creator", emoji: "✨" },
  { id: "freelancer", label: "Freelancer", emoji: "💼" },
  { id: "operator", label: "Operator / Manager", emoji: "⚙️" },
  { id: "consultant", label: "Consultant", emoji: "🎯" },
  { id: "executive", label: "Executive / CXO", emoji: "👔" },
  { id: "other", label: "Other", emoji: "🌟" },
]

export default function IdentityPage() {
  const router = useRouter()
  const role = useOnboardingStore((s) => s.role)
  const setRole = useOnboardingStore((s) => s.setRole)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  return (
    <div>
      <h1 id="identity-title" className="text-title-sm font-semibold">Which best describes you?</h1>
      <p className="mt-1 mb-8 text-body text-muted-foreground">
        This helps us tailor your content strategy.
      </p>

      <OptionCardGroup
        value={role || null}
        onValueChange={(value) => setRole(value as string)}
        aria-labelledby="identity-title"
        aria-invalid={attemptedSubmit && !role ? true : undefined}
        columns={2}
        className={cn("rounded-card", attemptedSubmit && !role && "ring-2 ring-danger ring-offset-4 ring-offset-background")}
      >
        {ROLES.map((r) => (
          <OptionCard
            key={r.id}
            value={r.id}
            title={r.label}
            layout="row"
            className="sm:p-4"
          />
        ))}
      </OptionCardGroup>

      <StepNav
        onContinue={() => router.push("/onboarding/industry")}
        canContinue={!!role}
        validationMessage="Please select what best describes you to continue."
        onInvalid={() => setAttemptedSubmit(true)}
      />
    </div>
  )
}
