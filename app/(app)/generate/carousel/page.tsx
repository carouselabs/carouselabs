import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { CarouselClient } from "./_client"

export default async function CarouselPage({
  searchParams,
}: {
  searchParams: Promise<{ ideaId?: string }>
}) {
  const { ideaId } = await searchParams
  if (!ideaId) redirect("/dashboard")

  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { subscription: true, profile: { select: { voiceGuidelines: true } } },
  })
  if (!user) redirect("/sign-in")

  const hasGuidelines = !!user.profile?.voiceGuidelines?.trim()

  // Carousels are a Pro-only feature. Enforce it server-side so Free users can't
  // reach carousel generation by navigating to this URL directly (the
  // FormatPicker hides the option, but that's only the client-side gate).
  if ((user.subscription?.plan ?? "FREE") === "FREE") redirect("/settings/billing")

  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
  })

  if (!idea || idea.userId !== user.id) notFound()
  if (!idea.breakdowns[0]) redirect(`/idea/${ideaId}`)

  // key={ideaId} forces a full remount when the idea changes, so per-idea client
  // state (reference image, caption, slides, step) can never leak between ideas
  // when only the ?ideaId searchParam changes.
  return (
    <CarouselClient
      key={ideaId}
      ideaId={ideaId}
      ideaHook={idea.hook}
      hasGuidelines={hasGuidelines}
      isOwnIdea={idea.source === "own-idea"}
    />
  )
}
