import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import OnboardingLayout from "@/app/(onboarding)/layout"
import IdentityPage from "@/app/(onboarding)/onboarding/identity/page"
import IndustryPage from "@/app/(onboarding)/onboarding/industry/page"
import TopicsPage from "@/app/(onboarding)/onboarding/topics/page"
import AudiencePage from "@/app/(onboarding)/onboarding/audience/page"
import GoalsPage from "@/app/(onboarding)/onboarding/goals/page"
import VoicePage from "@/app/(onboarding)/onboarding/voice/page"
import CompletingPage from "@/app/(onboarding)/onboarding/completing/page"

// Development-only: the real onboarding steps inside the real onboarding
// layout, reachable without signing in. Continue still navigates to the real
// (protected) routes. The progress bar reads the real pathname, so it only
// appears on the real /onboarding/* pages.
const STEPS = {
  identity: IdentityPage,
  industry: IndustryPage,
  topics: TopicsPage,
  audience: AudiencePage,
  goals: GoalsPage,
  voice: VoicePage,
  completing: CompletingPage,
} as const

export default async function OnboardingPreview({ params }: { params: Promise<{ step: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound()
  // Signed in, "Finish" on the voice step would overwrite the real profile
  // (POST /api/profile) — so the preview only runs signed out.
  const { userId } = await auth()
  if (userId) {
    return (
      <p className="p-8 font-sans text-[#211F1C]">
        Preview disabled while signed in: finishing would overwrite your real profile. Open it in a private window.
      </p>
    )
  }
  const { step } = await params
  const Step = STEPS[step as keyof typeof STEPS]
  if (!Step) notFound()
  return (
    <OnboardingLayout>
      <Step />
    </OnboardingLayout>
  )
}
