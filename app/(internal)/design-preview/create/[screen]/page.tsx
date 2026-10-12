import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { CaptionClient } from "@/app/(app)/generate/caption/_client"
import { ImageClient } from "@/app/(app)/generate/image/_client"
import { CarouselClient } from "@/app/(app)/generate/carousel/_client"
import { IdeaView } from "@/components/idea/IdeaView"
import { AppChrome } from "@/components/shell/AppChrome"
import { AppFrame } from "@/components/shell/AppFrame"

// Development-only: the idea page and the three creation flows in the real
// app frame, with example props, without signing in. Their requests
// (/api/generate/*, /api/posts, …) answer 401 signed out; the browser checks
// replace them with example data. Signed in they would spend real credits
// and save real posts — so the preview refuses to run then.
//   ?plan=FREE        the idea page as a Free user (carousels locked)
//   ?guidelines=1     the user has saved voice guidelines
const IDEA_ID = "example-idea"
const HOOK = "Example: The hiring mistake that cost us six months — and the 3 questions that fixed it"
const DEEP_DIVE = [
  "**Why this matters now**",
  "Most early teams hire for speed. The cost shows up three months later, when the wrong fit has shaped how everyone else works.",
  "**The three questions**",
  "- **What will they own in 90 days?** If you can't answer, you aren't ready to hire.",
  "- **Who will they learn from?** A strong hire with no one to learn from stalls.",
  "- **What would make you let them go?** Naming it early makes the bar real.",
  "**How to close the post**",
  "Ask readers which question they wish they had asked before their last hire.",
].join("\n")

const SCREENS = {
  idea: "/idea/example-idea",
  caption: "/generate/caption",
  image: "/generate/image",
  carousel: "/generate/carousel",
} as const

export default async function CreatePreview({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>
  searchParams: Promise<{ plan?: string; guidelines?: string }>
}) {
  if (process.env.NODE_ENV !== "development") notFound()
  const { userId } = await auth()
  if (userId) {
    return (
      <p className="p-8 font-sans text-[#211F1C]">
        Preview disabled while signed in: it would spend real credits and save real posts. Open it in a private window.
      </p>
    )
  }
  const { screen } = await params
  if (!(screen in SCREENS)) notFound()
  const { plan, guidelines } = await searchParams
  const hasGuidelines = guidelines === "1"

  return (
    <AppFrame>
      <AppChrome pathname={SCREENS[screen as keyof typeof SCREENS]}>
        {screen === "idea" && (
          <IdeaView
            ideaId={IDEA_ID}
            hook={HOOK}
            rawCategory="Industry"
            createdAt={new Date("2026-10-11T09:00:00Z")}
            initialBreakdown={{ deepDive: DEEP_DIVE, refinedHook: HOOK, keyTalkingPoints: "", strongEndingLine: "" }}
            plan={plan === "FREE" ? "FREE" : "PRO"}
          />
        )}
        {screen === "caption" && <CaptionClient ideaId={IDEA_ID} ideaHook={HOOK} hasGuidelines={hasGuidelines} />}
        {screen === "image" && <ImageClient ideaId={IDEA_ID} ideaHook={HOOK} hasGuidelines={hasGuidelines} isOwnIdea={false} />}
        {screen === "carousel" && <CarouselClient ideaId={IDEA_ID} ideaHook={HOOK} hasGuidelines={hasGuidelines} isOwnIdea={false} />}
      </AppChrome>
    </AppFrame>
  )
}
