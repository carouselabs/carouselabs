// app/api/webhooks/lemonsqueezy/route.ts
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { planForVariantId, creditsForPlan } from "@/lib/lemonsqueezy"
import {
  sendUpgradedToProEmail,
  sendSubscriptionCancelledEmail,
  sendMonthlyResetEmail,
} from "@/lib/email"

// Lemon Squeezy events are signed with HMAC-SHA256 over the raw body, so this
// route must read req.text() (not req.json()) before parsing.
export const runtime = "nodejs"

// ── Minimal payload shape we rely on ──────────────────────────────
// Lemon Squeezy nests the event name under `meta.event_name`; the resource
// fields live under `data.attributes`.
type LsWebhook = {
  meta: { event_name: string; webhook_id?: string; custom_data?: Record<string, unknown> }
  data: {
    id: string
    attributes: {
      user_email?: string
      customer_id?: number
      variant_id?: number
      status?: string
      renews_at?: string | null
      ends_at?: string | null
    }
  }
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
  const sigBuf = Buffer.from(signature, "utf8")
  const digestBuf = Buffer.from(digest, "utf8")
  // timingSafeEqual throws on length mismatch — guard first.
  if (sigBuf.length !== digestBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, digestBuf)
}

export async function POST(req: Request) {
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    return new Response("Missing LEMONSQUEEZY_WEBHOOK_SECRET", { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get("x-signature") ?? ""

  if (!verifySignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 401 })
  }

  let payload: LsWebhook
  try {
    payload = JSON.parse(rawBody) as LsWebhook
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  // ── Idempotency ──
  // Lemon Squeezy redelivers on timeout/non-2xx. Record each unique delivery and
  // skip anything we've already processed, so a redelivery can't resend emails
  // or re-reset credits. A true redelivery is byte-identical, so a hash of the
  // raw body is a stable per-delivery key; prefer an explicit id if present.
  const eventId =
    payload.meta?.webhook_id ??
    crypto.createHash("sha256").update(rawBody).digest("hex")

  try {
    await db.processedWebhookEvent.create({
      data: { eventId, source: "lemonsqueezy" },
    })
  } catch {
    // Unique-constraint violation = we've already handled this exact delivery.
    console.log("[webhooks/lemonsqueezy] duplicate event, skipping:", eventId)
    return new Response("OK (duplicate, skipped)", { status: 200 })
  }

  const eventName = payload.meta?.event_name
  const attrs = payload.data?.attributes ?? {}
  const customerEmail = attrs.user_email

  // order_created carries the buyer email too — log it and we're done.
  if (eventName === "order_created") {
    console.log("[webhooks/lemonsqueezy] order_created:", payload.data.id, customerEmail)
    return new Response("OK", { status: 200 })
  }

  if (!customerEmail) {
    console.error("[webhooks/lemonsqueezy] no user_email on event:", eventName)
    return new Response("OK", { status: 200 })
  }

  const user = await db.user.findFirst({
    where: { email: customerEmail },
    include: { profile: true },
  })
  if (!user) {
    // Unknown email (e.g. test purchase) — ack so Lemon Squeezy stops retrying.
    console.error("[webhooks/lemonsqueezy] no user for email:", customerEmail)
    return new Response("OK", { status: 200 })
  }

  // User.name lives on Profile in this schema.
  const name = user.profile?.name ?? ""

  try {
    switch (eventName) {
      case "subscription_created": {
        // The webhook payload only tells us which variant was bought, not
        // which product tier that maps to — resolve it explicitly rather
        // than assuming every subscription is Pro.
        const plan = planForVariantId(attrs.variant_id)
        const credits = creditsForPlan(plan)
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            plan,
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
            creditsUsed: 0,
            creditsTotal: credits,
            lsSubscriptionId: payload.data.id,
            lsCustomerId: attrs.customer_id != null ? String(attrs.customer_id) : null,
            lsVariantId: attrs.variant_id != null ? String(attrs.variant_id) : null,
            currentPeriodStart: new Date(),
            currentPeriodEnd: attrs.renews_at ? new Date(attrs.renews_at) : null,
          },
        })
        await safeEmail(() =>
          sendUpgradedToProEmail(user.email, name, credits, plan === "GROWTH" ? "Growth" : "Pro"),
        )
        break
      }

      case "subscription_updated": {
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            status: mapStatus(attrs.status),
            currentPeriodEnd: attrs.renews_at ? new Date(attrs.renews_at) : undefined,
          },
        })
        break
      }

      case "subscription_cancelled": {
        // Cancel at period end — user keeps their plan until currentPeriodEnd.
        const cancelledPlan = planForVariantId(attrs.variant_id)
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            cancelAtPeriodEnd: true,
            status: "CANCELLED",
            currentPeriodEnd: attrs.ends_at ? new Date(attrs.ends_at) : undefined,
          },
        })
        await safeEmail(() =>
          sendSubscriptionCancelledEmail(
            user.email,
            name,
            cancelledPlan === "GROWTH" ? "Growth" : "Pro",
          ),
        )
        break
      }

      case "subscription_payment_success": {
        // Monthly renewal succeeded — reset the credit allowance. Re-derive
        // the plan from the variant on this event (not the stored row) so a
        // renewal always resets to the correct tier's allowance.
        const plan = planForVariantId(attrs.variant_id)
        const credits = creditsForPlan(plan)
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            plan,
            creditsUsed: 0,
            creditsTotal: credits,
            currentPeriodEnd: attrs.renews_at ? new Date(attrs.renews_at) : undefined,
          },
        })
        await safeEmail(() => sendMonthlyResetEmail(user.email, name, credits))
        break
      }

      case "subscription_payment_failed": {
        await db.subscription.update({
          where: { userId: user.id },
          data: { status: "PAST_DUE" },
        })
        // No dedicated "payment failed" email template exists yet — surface it
        // in logs so it can be followed up / a template added later.
        console.error("[webhooks/lemonsqueezy] payment failed for:", user.email)
        break
      }

      default:
        console.log("[webhooks/lemonsqueezy] unhandled event:", eventName)
    }
  } catch (err) {
    console.error("[webhooks/lemonsqueezy] handler error:", eventName, err)
    // Roll back the idempotency record so Lemon Squeezy's retry can reprocess
    // this event, instead of it being permanently skipped as a "duplicate".
    await db.processedWebhookEvent.delete({ where: { eventId } }).catch(() => {})
    return new Response("Handler error", { status: 500 })
  }

  return new Response("OK", { status: 200 })
}

// Maps Lemon Squeezy subscription statuses onto our SubscriptionStatus enum.
function mapStatus(status?: string): "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING" | "EXPIRED" {
  switch (status) {
    case "on_trial":
      return "TRIALING"
    case "cancelled":
      return "CANCELLED"
    case "past_due":
    case "unpaid":
      return "PAST_DUE"
    case "expired":
      return "EXPIRED"
    default:
      return "ACTIVE"
  }
}

// Emails are best-effort — never fail a webhook because Resend hiccuped.
async function safeEmail(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.error("[webhooks/lemonsqueezy] email failed:", err)
  }
}
