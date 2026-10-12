// /admin/users/[userId] — full user profile with admin actions panel.
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"
import { UserProfileView } from "@/components/admin/UserProfileView"

export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: true,
      posts: {
        orderBy: { createdAt: "desc" },
        include: { idea: { select: { title: true, hook: true } } },
      },
    },
  })
  if (!user) notFound()

  const sub = user.subscription
  const plan = sub?.plan ?? "FREE"
  const creditsRemaining = sub
    ? availableCredits({
        plan,
        creditsUsed: sub.creditsUsed,
        creditsTotal: sub.creditsTotal,
        extraCredits: sub.extraCredits,
        extraCreditsExpiry: sub.extraCreditsExpiry,
      })
    : 0

  return (
    <UserProfileView
      user={user}
      sub={sub}
      plan={plan}
      creditsRemaining={creditsRemaining}
      posts={user.posts}
    />
  )
}
