// app/api/billing/create-subscription/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { razorpay } from "@/lib/razorpay"

// Creates a Razorpay subscription for the Pro plan ($24/month). The plan itself
// (amount 2400 cents, currency USD, monthly interval) must be created once in
// the Razorpay dashboard and its id set as RAZORPAY_PLAN_ID. International
// payments must be enabled on the Razorpay account for USD billing.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = process.env.RAZORPAY_PLAN_ID
  if (!planId) {
    return NextResponse.json({ error: "Pro plan is not configured" }, { status: 500 })
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 120, // up to 10 years of monthly cycles
      customer_notify: 1,
      notes: { userId: user.id },
    })

    // Store the subscription id now so the webhook can map events back to the
    // user even before payment completes.
    await db.subscription.update({
      where: { userId: user.id },
      data: { razorpaySubId: subscription.id },
    })

    return NextResponse.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
    })
  } catch (err) {
    console.error("[billing/create-subscription] error:", err)
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 502 })
  }
}
