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
      <h1 className="text-2xl font-semibold text-[#F0F0FA] mb-1">Who are you writing for?</h1>
      <p className="text-sm text-[rgba(255,255,255,0.45)] mb-8">
        Define your ideal reader so we can shape your content's angle.
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.45)] mb-2 uppercase tracking-wide">
            Their Job Role
          </label>
          <input
            type="text"
            value={audienceRole}
            onChange={(e) => setAudienceRole(e.target.value)}
            placeholder="e.g. Marketing Manager, CTO, Founder…"
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#F0F0FA] placeholder-[rgba(255,255,255,0.22)] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.45)] mb-3 uppercase tracking-wide">
            Seniority Level{" "}
            <span className="text-[rgba(255,255,255,0.3)] normal-case font-normal">(optional)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SENIORITY.map((opt) => (
              <button
                key={opt}
                onClick={() => setAudienceSeniority(audienceSeniority === opt ? "" : opt)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                  audienceSeniority === opt
                    ? "border-[#7C3AED] bg-[rgba(124,58,237,0.12)] text-[#A78BFA]"
                    : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.16)] hover:text-[rgba(255,255,255,0.8)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.45)] mb-2 uppercase tracking-wide">
            Their Industry{" "}
            <span className="text-[rgba(255,255,255,0.3)] normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={audienceIndustry}
            onChange={(e) => setAudienceIndustry(e.target.value)}
            placeholder="e.g. B2B SaaS, Healthcare, Finance…"
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#F0F0FA] placeholder-[rgba(255,255,255,0.22)] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.45)] mb-2 uppercase tracking-wide">
            Core Problem They Face{" "}
            <span className="text-[rgba(255,255,255,0.3)] normal-case font-normal">(optional)</span>
          </label>
          <textarea
            value={coreProblem}
            onChange={(e) => setCoreProblem(e.target.value)}
            placeholder="e.g. Struggling to generate leads on LinkedIn, building a brand without time…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[#F0F0FA] placeholder-[rgba(255,255,255,0.22)] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
          />
        </div>
      </div>

      <StepNav
        backHref="/onboarding/topics"
        onContinue={next}
        canContinue={!!audienceRole}
        showSkip
        onSkip={next}
      />
    </div>
  )
}
