// app/api/webhooks/lemonsqueezy/route.ts
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { planForVariantId, creditsForPlan } from "@/lib/lemonsqueezy"
import {
  sendUpgradedToProEmail,
  sendSubscriptionCancelledEmail,
  sendMonthlyResetEmail,
  sendTopUpEmail,
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
      // order_created only:
      subtotal?: number
      total?: number
      first_order_item?: { variant_id?: number }
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

  try {
    // Top-up grants resolve the buyer from meta.custom_data.user_id (stamped
    // from the authenticated session when the overlay checkout was opened)
    // instead of the checkout email — the Lemon Squeezy form lets buyers type
    // any email, which could route the credits to a different account or,
    // with an unknown email, drop them entirely. Handled before the
    // email-keyed subscription flow below so that flow's guards can't
    // short-circuit it.
    if (eventName === "order_created") {
      await handleTopUpOrder(payload, attrs)
      return new Response("OK", { status: 200 })
    }

    const customerEmail = attrs.user_email
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

    switch (eventName) {
      case "subscription_created": {
        // The webhook payload only tells us which variant was bought, not
        // which product tier that maps to — resolve it explicitly rather
        // than assuming every subscription is Pro.
        const plan = planForVariantId(attrs.variant_id)
        const credits = creditsForPlan(plan)
        console.log(
          "[webhooks/lemonsqueezy] subscription_created: saving lsSubscriptionId:",
          payload.data.id,
        )
        await db.subscription.update({
          where: { userId: user.id },
          data: {
            plan,
            status: "ACTIVE",
            cancelAtPeriodEnd: false,
            upgradeScheduled: false,
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
        // Lemon Squeezy fires this for in-place plan swaps (Pro ↔ Growth via
        // the customer portal / Update Subscription API), not just status
        // changes — so a variant change here must retier the plan and reset
        // the credit allowance, or upgrades sit uncredited until the next
        // renewal.
        const plan = planForVariantId(attrs.variant_id)
        const credits = creditsForPlan(plan)

        const currentSub = await db.subscription.findUnique({
          where: { userId: user.id },
          select: { plan: true, creditsUsed: true, creditsTotal: true, upgradeScheduled: true },
        })

        const planChanged = currentSub != null && currentSub.plan !== plan

        // A scheduled upgrade (POST /api/billing/upgrade) swaps the variant
        // with prorations disabled — Lemon Squeezy fires this event right
        // away, but the customer hasn't paid the new price yet. Update the
        // plan now but hold credits at the old allowance; the renewal's
        // subscription_payment_success resets them to the new tier.
        const isScheduledUpgrade = planChanged && currentSub?.upgradeScheduled === true

        await db.subscription.update({
          where: { userId: user.id },
          data: {
            status: mapStatus(attrs.status),
            // Keep the stored id in sync with the event's subscription — also
            // self-heals rows where a manual backfill stored a bad id.
            lsSubscriptionId: payload.data.id,
            currentPeriodEnd: attrs.renews_at ? new Date(attrs.renews_at) : undefined,
            // If plan changed, update plan (and reset credits unless the
            // upgrade is deferred to renewal)
            ...(planChanged
              ? {
                  plan,
                  lsVariantId: attrs.variant_id != null ? String(attrs.variant_id) : null,
                  ...(isScheduledUpgrade ? {} : { creditsUsed: 0, creditsTotal: credits }),
                }
              : {}),
          },
        })

        // Send upgrade email if plan changed to a paid plan. Scheduled
        // upgrades skip it — nothing was charged or credited yet; the
        // renewal-time reset email covers activation.
        if (planChanged && !isScheduledUpgrade && (plan === "PRO" || plan === "GROWTH")) {
          await safeEmail(() =>
            sendUpgradedToProEmail(user.email, name, credits, plan === "GROWTH" ? "Growth" : "Pro"),
          )
        }

        if (planChanged) {
          console.log(
            `[webhooks/lemonsqueezy] plan changed for user ${user.id}: ${currentSub?.plan} → ${plan}, credits reset to ${credits}`,
          )
        }

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
            // A pending Pro → Growth upgrade activates with this payment.
            upgradeScheduled: false,
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

// order_created fires for every purchase, including new subscriptions — only
// orders for the top-up variant grant extra credits. The buyer is identified
// by meta.custom_data.user_id, never by the order's email (see caller).
// Returning without granting acks the event so Lemon Squeezy stops retrying;
// anything flagged "needs manual review" is unrecoverable by retry.
async function handleTopUpOrder(payload: LsWebhook, attrs: LsWebhook["data"]["attributes"]) {
  const topupVariantId = parseInt(process.env.LEMONSQUEEZY_TOPUP_VARIANT_ID ?? "0", 10)
  const orderVariantId = attrs.first_order_item?.variant_id

  if (!topupVariantId || orderVariantId !== topupVariantId) {
    console.log(
      "[webhooks/lemonsqueezy] order_created: not a top-up order, skipping:",
      payload.data.id,
    )
    return
  }

  const customUserId = payload.meta?.custom_data?.user_id
  if (typeof customUserId !== "string" || customUserId === "") {
    console.error(
      `[webhooks/lemonsqueezy] top-up: no custom user_id on order ${payload.data.id} — cannot identify buyer, needs manual review`,
    )
    return
  }

  const user = await db.user.findUnique({
    where: { id: customUserId },
    include: { profile: true },
  })
  if (!user) {
    console.error(
      `[webhooks/lemonsqueezy] top-up: no user for custom user_id ${customUserId} (order ${payload.data.id}) — needs manual review`,
    )
    return
  }

  // $2 per 100 credits, exact multiples of 100 only. Use the pre-tax
  // subtotal — `total` includes sales tax where Lemon Squeezy collects
  // it, which would inflate (or push out of range) the credit count.
  const amountPaidCents = attrs.subtotal ?? attrs.total ?? 0
  const amountPaidDollars = amountPaidCents / 100
  const creditsToGrant = Math.floor(amountPaidDollars / 2) * 100

  if (creditsToGrant < 100 || creditsToGrant > 5000 || creditsToGrant % 100 !== 0) {
    console.error(
      `[webhooks/lemonsqueezy] top-up: invalid credit amount ${creditsToGrant} from $${amountPaidDollars} (order ${payload.data.id}, user ${user.id}) — needs manual review`,
    )
    return
  }

  // Extra credits expire 2 months from purchase. Stacking a new top-up
  // onto unexpired extras extends the whole balance to the new expiry.
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + 2)

  // Upsert: a user without a Subscription row (pre-backfill account)
  // gets one created so their paid credits are never dropped.
  await db.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan: "FREE",
      status: "ACTIVE",
      creditsTotal: 0,
      creditsUsed: 0,
      extraCredits: creditsToGrant,
      extraCreditsExpiry: expiry,
    },
    update: {
      extraCredits: { increment: creditsToGrant },
      extraCreditsExpiry: expiry,
    },
  })

  console.log(
    `[webhooks/lemonsqueezy] top-up: granted ${creditsToGrant} credits to user ${user.id}, expires ${expiry.toISOString()}`,
  )

  const name = user.profile?.name ?? ""
  await safeEmail(() => sendTopUpEmail(user.email, name, creditsToGrant, expiry))
}
