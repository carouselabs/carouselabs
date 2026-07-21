import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { availableCredits, extraCreditsValid, FREE_LIFETIME_POSTS } from "@/lib/credits"
import { isAdminEmail } from "@/lib/adminAuth"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true, subscription: true, usage: true },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const sub = user.subscription
  const plan = sub?.plan ?? "FREE"
  const creditsRemaining = availableCredits({
    plan,
    creditsUsed: sub?.creditsUsed ?? 0,
    creditsTotal: sub?.creditsTotal ?? 1000,
    extraCredits: sub?.extraCredits ?? 0,
    extraCreditsExpiry: sub?.extraCreditsExpiry ?? null,
  })

  // Unexpired purchased top-up credits (already included in creditsRemaining) —
  // lets the UI show the "X credits + Y extra" breakdown.
  const extraCredits =
    sub &&
    extraCreditsValid({
      extraCredits: sub.extraCredits,
      extraCreditsExpiry: sub.extraCreditsExpiry,
    })
      ? sub.extraCredits
      : 0

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.profile?.name ?? null,
    plan,
    postsToday: user.usage?.postsToday ?? 0,
    postsTotal: user.usage?.postsTotal ?? 0,
    creditsRemaining,
    extraCredits,
    freeLimit: FREE_LIFETIME_POSTS,
    onboardingDone: user.profile?.onboardingDone ?? false,
    isAdmin: isAdminEmail(user.email),
  })
}
