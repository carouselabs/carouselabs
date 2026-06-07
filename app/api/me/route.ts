import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true, subscription: true, usage: true },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.profile?.name ?? null,
    plan: user.subscription?.plan ?? "FREE",
    postsToday: user.usage?.postsToday ?? 0,
    postsTotal: user.usage?.postsTotal ?? 0,
    onboardingDone: user.profile?.onboardingDone ?? false,
  })
}
