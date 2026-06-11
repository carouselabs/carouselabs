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

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) redirect("/sign-in")

  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { breakdowns: { orderBy: { createdAt: "desc" }, take: 1 } },
  })

  if (!idea || idea.userId !== user.id) notFound()
  if (!idea.breakdowns[0]) redirect(`/idea/${ideaId}`)

  return <CarouselClient ideaId={ideaId} ideaHook={idea.hook} />
}
