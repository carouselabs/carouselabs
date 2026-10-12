// app/(app)/idea/[id]/page.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { dbEnumsToRawCategory } from "@/lib/ai/parsers/ideas"
import { IdeaView } from "@/components/idea/IdeaView"
import type { BreakdownOutline } from "@/lib/types/breakdown"

export default async function IdeaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  })
  if (!user) redirect("/sign-in")

  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      breakdowns: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!idea || idea.userId !== user.id) notFound()

  const rawCategory = dbEnumsToRawCategory(idea.mode, idea.category)
  const plan = user.subscription?.plan ?? "FREE"
  const cachedBreakdown = (idea.breakdowns[0]?.outline ?? null) as unknown as BreakdownOutline | null

  return (
    <IdeaView
      ideaId={id}
      hook={idea.hook}
      rawCategory={rawCategory}
      createdAt={idea.createdAt}
      initialBreakdown={cachedBreakdown}
      plan={plan}
    />
  )
}
