// app/(app)/generate/caption/page.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { CaptionClient } from "./_client"

export default async function CaptionPage({
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
    include: { profile: { select: { voiceGuidelines: true } } },
  })
  if (!user) redirect("/sign-in")

  const hasGuidelines = !!user.profile?.voiceGuidelines?.trim()

  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
  })

  if (!idea || idea.userId !== user.id) notFound()

  // Must have a breakdown to generate a caption
  if (!idea.breakdowns[0]) redirect(`/idea/${ideaId}`)

  // key={ideaId} forces a full remount when the idea changes, so per-idea client
  // state can never leak between ideas when only the ?ideaId searchParam changes.
  return <CaptionClient key={ideaId} ideaId={ideaId} ideaHook={idea.hook} hasGuidelines={hasGuidelines} />
}
