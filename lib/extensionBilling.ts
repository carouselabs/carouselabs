// lib/extensionBilling.ts — Lemon Squeezy webhooks for the extension's
// $15/month subscription. app/api/webhooks/lemonsqueezy calls
// isExtensionWebhook FIRST and hands matching events here, before any of its
// web-plan handling: that code finds the buyer by email and maps an unknown
// variant to Pro, so an extension purchase would otherwise grant web Pro —
// and its expiry would downgrade the buyer's real web plan to Free.
//
// The buyer is identified by meta.custom_data.user_id (stamped by
// app/api/ext/checkout from the signed-in account), or by the subscription
// already stored for them — never by the checkout email, which the buyer can
// type freely (same rule as the credit top-ups).
import { db } from "@/lib/db"
import { createCommissionForPayment } from "@/lib/referral"
import {
  isExtensionPayload,
  shouldApplyToStored,
  subscriptionIdOf,
  type ExtensionWebhookPayload,
} from "@/lib/extensionAccessRules"

function extensionVariantId(): number {
  return parseInt(process.env.LEMONSQUEEZY_EXTENSION_VARIANT_ID ?? "0", 10) || 0
}

export async function isExtensionWebhook(payload: ExtensionWebhookPayload): Promise<boolean> {
  if (isExtensionPayload(payload, extensionVariantId())) return true
  const subId = subscriptionIdOf(payload)
  if (!subId) return false
  return (await db.extensionSubscription.findUnique({ where: { lsSubscriptionId: subId }, select: { id: true } })) !== null
}

const SUBSCRIPTION_STATE_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
])

type SubscriptionAttributes = {
  status?: string
  customer_id?: number
  variant_id?: number
  renews_at?: string | null
  ends_at?: string | null
  urls?: { customer_portal?: string }
}

const asDate = (value: string | null | undefined) => (value ? new Date(value) : null)

export async function handleExtensionWebhook(payload: ExtensionWebhookPayload): Promise<void> {
  const eventName = payload.meta?.event_name ?? ""

  if (eventName === "subscription_payment_success") {
    await payReferralCommission(payload)
    return
  }

  // Other invoices and the order behind a new subscription need no action:
  // every change to access arrives as a subscription_* state event.
  if (!SUBSCRIPTION_STATE_EVENTS.has(eventName)) {
    console.log(`[extensionBilling] ${eventName}: no action needed`)
    return
  }

  const subId = subscriptionIdOf(payload)
  if (!subId) {
    console.error(`[extensionBilling] ${eventName}: no subscription id — needs manual review`)
    return
  }

  const customUserId = payload.meta?.custom_data?.user_id
  const stored = await db.extensionSubscription.findUnique({ where: { lsSubscriptionId: subId } })
  let userId = stored?.userId ?? null
  if (!userId && typeof customUserId === "string" && customUserId) {
    const user = await db.user.findUnique({ where: { id: customUserId }, select: { id: true } })
    userId = user?.id ?? null
  }
  if (!userId) {
    console.error(`[extensionBilling] ${eventName}: can't identify the buyer of subscription ${subId} — needs manual review`)
    return
  }

  const current = await db.extensionSubscription.findUnique({ where: { userId }, select: { lsSubscriptionId: true } })
  if (!shouldApplyToStored(current?.lsSubscriptionId ?? null, subId, eventName)) {
    console.log(`[extensionBilling] ${eventName}: subscription ${subId} is older than the one stored for ${userId}, ignored`)
    return
  }

  const attrs = (payload.data?.attributes ?? {}) as SubscriptionAttributes
  const fields = {
    lsSubscriptionId: subId,
    lsCustomerId: attrs.customer_id != null ? String(attrs.customer_id) : null,
    lsVariantId: attrs.variant_id != null ? String(attrs.variant_id) : null,
    status: attrs.status ?? "active",
    renewsAt: asDate(attrs.renews_at),
    endsAt: asDate(attrs.ends_at),
    customerPortalUrl: attrs.urls?.customer_portal ?? null,
  }
  await db.extensionSubscription.upsert({ where: { userId }, create: { userId, ...fields }, update: fields })
  console.log(`[extensionBilling] ${eventName}: user ${userId} → ${fields.status}`)
}

// Referrers earn 8% of every extension payment, the same as for a web plan
// (lib/referral.ts). Each successful invoice — the first payment and every
// renewal — is one commission; the invoice's own id is the key that makes a
// redelivered event a no-op instead of a double payout.
async function payReferralCommission(payload: ExtensionWebhookPayload): Promise<void> {
  const invoiceId = payload.data?.id
  const subId = subscriptionIdOf(payload)
  const stored = subId
    ? await db.extensionSubscription.findUnique({ where: { lsSubscriptionId: subId }, select: { userId: true } })
    : null
  // The first payment can arrive before subscription_created has stored the
  // subscription; the id stamped at checkout identifies the buyer then.
  let userId = stored?.userId ?? null
  const customUserId = payload.meta?.custom_data?.user_id
  if (!userId && typeof customUserId === "string" && customUserId) {
    userId = (await db.user.findUnique({ where: { id: customUserId }, select: { id: true } }))?.id ?? null
  }
  if (!userId || !invoiceId) {
    console.error(`[extensionBilling] payment ${invoiceId ?? "?"}: can't identify the buyer — no referral commission, needs manual review`)
    return
  }

  const attrs = (payload.data?.attributes ?? {}) as { subtotal?: number; total?: number }
  try {
    const result = await createCommissionForPayment({
      referredUserId: userId,
      sourceOrderId: invoiceId,
      // Pre-tax, like the web plans' commissions.
      subtotalCents: attrs.subtotal ?? attrs.total ?? 0,
      sourceEvent: "subscription_payment_success",
    })
    console.log(`[extensionBilling] payment ${invoiceId}: referral commission ${result}`)
  } catch (err) {
    // Best effort, like the web plans': access was never tied to this.
    console.error(`[extensionBilling] payment ${invoiceId}: referral commission failed:`, err)
  }
}

