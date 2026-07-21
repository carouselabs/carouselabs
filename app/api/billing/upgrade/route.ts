// app/api/billing/upgrade/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { scheduleSubscriptionUpgrade } from "@/lib/lemonsqueezy"

// Schedules a Pro → Growth upgrade for the next renewal. No charge today:
// Lemon Squeezy swaps the variant with prorations disabled, so the first
// Growth invoice (and the 2,000-credit allowance) arrives at renewal.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sub = user.subscription
  if (sub?.plan !== "PRO") {
    return NextResponse.json(
      { error: sub?.plan === "GROWTH" ? "Already on Growth" : "Growth upgrades require an active Pro subscription" },
      { status: 400 },
    )
  }
  if (sub.upgradeScheduled) {
    return NextResponse.json({ ok: true, renewalDate: sub.currentPeriodEnd })
  }

  const subId = sub.lsSubscriptionId
  console.log("[billing/upgrade] lsSubscriptionId:", subId)
  if (!subId) {
    return NextResponse.json(
      { error: "No active subscription found. Please contact support." },
      { status: 400 },
    )
  }

  const growthVariantId = process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID
  if (!growthVariantId) {
    console.error("[billing/upgrade] LEMONSQUEEZY_GROWTH_VARIANT_ID is not set")
    return NextResponse.json({ error: "Upgrade unavailable" }, { status: 500 })
  }

  const scheduled = await scheduleSubscriptionUpgrade(subId, growthVariantId)
  if (!scheduled) {
    return NextResponse.json({ error: "Failed to schedule upgrade" }, { status: 502 })
  }

  await db.subscription.update({
    where: { userId: user.id },
    data: { upgradeScheduled: true },
  })

  return NextResponse.json({ ok: true, renewalDate: sub.currentPeriodEnd })
}
