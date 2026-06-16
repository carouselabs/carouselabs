// app/api/webhooks/razorpay/route.ts
import { headers } from "next/headers"
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { razorpay, PRO_MONTHLY_CREDITS } from "@/lib/razorpay"
import {
  sendUpgradedToProEmail,
  sendMonthlyResetEmail,
  sendSubscriptionCancelledEmail,
  sendExtraCreditsEmail,
} from "@/lib/email"

interface RazorpayEvent {
  event: string
  payload: {
    subscription?: { entity: { id: string; current_end?: number; notes?: Record<string, string> } }
    payment?: { entity: { id: string; order_id?: string; notes?: Record<string, string> } }
  }
}

function safeEmail(promise: Promise<unknown>, label: string) {
  promise.catch((err) => console.error(`[webhooks/razorpay] ${label} email failed:`, err))
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return new Response("Missing RAZORPAY_WEBHOOK_SECRET", { status: 500 })
  }

  // Verify signature against the RAW body before parsing.
  const body = await req.text()
  const signature = (await headers()).get("x-razorpay-signature") ?? ""
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex")
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return new Response("Invalid signature", { status: 400 })
  }

  let event: RazorpayEvent
  try {
    event = JSON.parse(body) as RazorpayEvent
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  try {
    switch (event.event) {
      // ── Pro activated: first successful charge ──
      case "subscription.activated": {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const dbSub = await db.subscription.findFirst({
          where: { razorpaySubId: sub.id },
          include: { user: true },
        })
        if (!dbSub) break
        await db.subscription.update({
          where: { id: dbSub.id },
          data: {
            plan: "PRO",
            status: "ACTIVE",
            creditsUsed: 0,
            creditsTotal: PRO_MONTHLY_CREDITS,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
          },
        })
        safeEmail(sendUpgradedToProEmail(dbSub.user.email, "", PRO_MONTHLY_CREDITS), "upgraded")
        break
      }

      // ── Monthly renewal: reset credits ──
      case "subscription.charged": {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const dbSub = await db.subscription.findFirst({
          where: { razorpaySubId: sub.id },
          include: { user: true },
        })
        if (!dbSub) break
        // Skip the very first charge (already handled by subscription.activated).
        if (dbSub.plan === "PRO" && dbSub.creditsUsed === 0) {
          // still refresh the period end
          await db.subscription.update({
            where: { id: dbSub.id },
            data: {
              currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
            },
          })
          break
        }
        await db.subscription.update({
          where: { id: dbSub.id },
          data: {
            plan: "PRO",
            status: "ACTIVE",
            creditsUsed: 0,
            creditsTotal: PRO_MONTHLY_CREDITS,
            currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
          },
        })
        safeEmail(sendMonthlyResetEmail(dbSub.user.email, "", PRO_MONTHLY_CREDITS), "reset")
        break
      }

      // ── Cancelled: downgrade to Free ──
      case "subscription.cancelled": {
        const sub = event.payload.subscription?.entity
        if (!sub) break
        const dbSub = await db.subscription.findFirst({
          where: { razorpaySubId: sub.id },
          include: { user: true },
        })
        if (!dbSub) break
        await db.subscription.update({
          where: { id: dbSub.id },
          data: { plan: "FREE", status: "CANCELLED", cancelAtPeriodEnd: false },
        })
        safeEmail(sendSubscriptionCancelledEmail(dbSub.user.email, ""), "cancelled")
        break
      }

      // ── Extra credits purchase captured ──
      case "payment.captured": {
        const payment = event.payload.payment?.entity
        if (!payment?.order_id) break
        // Read the order notes authoritatively (don't trust the client).
        const order = await razorpay.orders.fetch(payment.order_id)
        const notes = (order.notes ?? {}) as Record<string, string>
        if (notes.type !== "extra_credits") break

        const credits = parseInt(notes.credits ?? "0", 10)
        const userId = notes.userId
        if (!credits || !userId) break

        const expiry = new Date()
        expiry.setMonth(expiry.getMonth() + 1)

        const dbSub = await db.subscription.findUnique({
          where: { userId },
          include: { user: true },
        })
        if (!dbSub) break
        await db.subscription.update({
          where: { userId },
          data: {
            extraCredits: { increment: credits },
            extraCreditsExpiry: expiry,
          },
        })
        safeEmail(
          sendExtraCreditsEmail(dbSub.user.email, "", credits, expiry.toLocaleDateString("en-IN")),
          "extra-credits",
        )
        break
      }
    }
  } catch (err) {
    console.error("[webhooks/razorpay] handler error:", err)
    return new Response("Handler error", { status: 500 })
  }

  return new Response("OK", { status: 200 })
}
