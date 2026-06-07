"use client"

import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"

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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#F0F0FA] mb-1">Which best describes you?</h1>
      <p className="text-sm text-[rgba(255,255,255,0.45)] mb-8">
        This helps us tailor your content strategy.
      </p>

      <div className="flex flex-col gap-2.5">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border text-left transition-all ${
              role === r.id
                ? "border-[#7C3AED] bg-[rgba(124,58,237,0.1)] text-[#F0F0FA]"
                : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[rgba(255,255,255,0.65)] hover:border-[rgba(255,255,255,0.15)] hover:text-[#F0F0FA]"
            }`}
          >
            <span className="text-lg">{r.emoji}</span>
            <span className="text-sm font-medium">{r.label}</span>
          </button>
        ))}
      </div>

      <StepNav
        onContinue={() => router.push("/onboarding/industry")}
        canContinue={!!role}
      />
    </div>
  )
}
