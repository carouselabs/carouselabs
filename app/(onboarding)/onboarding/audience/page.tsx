"use client"

import { useRouter } from "next/navigation"
import { useOnboardingStore } from "@/lib/store/onboardingStore"
import { StepNav } from "@/components/onboarding/StepNav"

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

  const next = () => router.push("/onboarding/goals")

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-1">Who are you writing for?</h1>
      <p className="text-sm text-[#6B7280] mb-8">
        Define your ideal reader so we can shape your content's angle.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">
            Their Job Role
          </label>
          <input
            type="text"
            value={audienceRole}
            onChange={(e) => setAudienceRole(e.target.value)}
            placeholder="e.g. Marketing Manager, CTO, Founder…"
            className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-3 uppercase tracking-wide">
            Seniority Level
          </label>
          <div className="flex flex-wrap gap-2">
            {SENIORITY.map((opt) => (
              <button
                key={opt}
                onClick={() => setAudienceSeniority(audienceSeniority === opt ? "" : opt)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                  audienceSeniority === opt
                    ? "border-[#1A1A1A] bg-[rgba(26,26,26,0.12)] text-[#1A1A1A]"
                    : "border-[#E5E3DE] text-[#6B7280] hover:border-[#DEDBD4] hover:text-[#1A1A1A]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">
            Their Industry
          </label>
          <input
            type="text"
            value={audienceIndustry}
            onChange={(e) => setAudienceIndustry(e.target.value)}
            placeholder="e.g. B2B SaaS, Healthcare, Finance…"
            className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7280] mb-2 uppercase tracking-wide">
            Core Problem They Face
          </label>
          <textarea
            value={coreProblem}
            onChange={(e) => setCoreProblem(e.target.value)}
            placeholder="e.g. Struggling to generate leads on LinkedIn, building a brand without time…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[#F4F2EC] border border-[#E5E3DE] text-[#0A0A0A] placeholder-[#ADA99F] text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors resize-none"
          />
        </div>
      </div>

      <StepNav
        backHref="/onboarding/topics"
        onContinue={next}
        canContinue={
          !!audienceRole &&
          !!audienceSeniority &&
          !!audienceIndustry.trim() &&
          !!coreProblem.trim()
        }
      />
    </div>
  )
}
