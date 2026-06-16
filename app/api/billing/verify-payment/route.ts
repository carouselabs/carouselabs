// app/api/billing/verify-payment/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { PRO_MONTHLY_CREDITS } from "@/lib/razorpay"

function hmac(payload: string): string {
  return crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "")
    .update(payload)
    .digest("hex")
}

// Constant-time compare so we don't leak timing info on the signature check.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_subscription_id,
    razorpay_signature,
  } = body as {
    razorpay_payment_id?: string
    razorpay_order_id?: string
    razorpay_subscription_id?: string
    razorpay_signature?: string
  }

  if (!razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // ── Subscription (Pro upgrade) ──
  if (razorpay_subscription_id) {
    const expected = hmac(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    if (!safeEqual(expected, razorpay_signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    // Optimistic, idempotent update for instant UI — the webhook
    // (subscription.activated) is the authoritative source and re-applies this.
    await db.subscription.update({
      where: { userId: user.id },
      data: {
        plan: "PRO",
        status: "ACTIVE",
        razorpaySubId: razorpay_subscription_id,
        creditsUsed: 0,
        creditsTotal: PRO_MONTHLY_CREDITS,
      },
    })
    return NextResponse.json({ success: true })
  }

  // ── One-time order (extra credits) ──
  if (razorpay_order_id) {
    const expected = hmac(`${razorpay_order_id}|${razorpay_payment_id}`)
    if (!safeEqual(expected, razorpay_signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    // Signature is valid. Extra credits are granted by the webhook
    // (payment.captured) so they're never double-counted; the client refetches.
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Missing order or subscription id" }, { status: 400 })
}
