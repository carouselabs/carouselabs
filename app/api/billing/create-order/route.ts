// app/api/billing/create-order/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  razorpay,
  PRICE_PER_CREDIT_CENTS,
  MIN_EXTRA_CREDITS,
  BILLING_CURRENCY,
} from "@/lib/razorpay"

// Creates a Razorpay order for an extra-credits purchase ($2/credit, min 5).
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let credits: number
  try {
    const body = await req.json()
    credits = Math.floor(Number(body.credits))
    if (!Number.isFinite(credits) || credits < MIN_EXTRA_CREDITS) {
      throw new Error(`Minimum ${MIN_EXTRA_CREDITS} credits`)
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 },
    )
  }

  const amount = credits * PRICE_PER_CREDIT_CENTS

  try {
    const order = await razorpay.orders.create({
      amount,
      currency: BILLING_CURRENCY,
      // Notes are read back (authoritatively) by the webhook to grant credits.
      notes: { type: "extra_credits", credits: String(credits), userId: user.id },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (err) {
    console.error("[billing/create-order] error:", err)
    return NextResponse.json({ error: "Failed to create order" }, { status: 502 })
  }
}
