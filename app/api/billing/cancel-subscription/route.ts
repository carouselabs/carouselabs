// app/api/billing/cancel-subscription/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { cancelSubscription } from "@lemonsqueezy/lemonsqueezy.js"
import { db } from "@/lib/db"
import { initLemonSqueezy } from "@/lib/lemonsqueezy"

// Cancels the user's Pro subscription at the end of the current billing cycle.
// The plan downgrade + email is finalised via the subscription_cancelled
// webhook when Lemon Squeezy confirms.
export async function POST() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const subId = user.subscription?.lsSubscriptionId
  if (!subId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 })
  }

  try {
    initLemonSqueezy()
    const { error } = await cancelSubscription(subId)
    if (error) throw error

    await db.subscription.update({
      where: { userId: user.id },
      data: { cancelAtPeriodEnd: true },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[billing/cancel-subscription] error:", err)
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 502 })
  }
}
