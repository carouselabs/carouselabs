// lib/extensionBilling.ts — Lemon Squeezy webhooks for the two extensions'
// $15/month subscriptions, sold separately: CarouseLabs Engage for LinkedIn
// (ExtensionSubscription) and CarouseLabs Engage for X (XSubscription).
// app/api/webhooks/lemonsqueezy calls isExtensionWebhook FIRST and hands
// matching events here, before any of its web-plan handling: that code finds
// the buyer by email and maps an unknown variant to Pro, so an extension
// purchase would otherwise grant web Pro — and its expiry would downgrade the
// buyer's real web plan to Free.
//
// The buyer is identified by meta.custom_data.user_id (stamped by the
// checkout from the signed-in account), or by the subscription already
// stored for them — never by the checkout email, which the buyer can type
// freely (same rule as the credit top-ups).
import { db } from "@/lib/db"
import { createCommissionForPayment } from "@/lib/referral"
import { X_EXTENSION_VARIANT_ID } from "@/lib/plans"
import {
  extensionPlatformOfPayload,
  shouldApplyToStored,
  subscriptionIdOf,
  type BillingPlatform,
  type ExtensionWebhookPayload,
} from "@/lib/extensionAccessRules"

function variantIds(): { linkedin: number; x: number } {
  return {
    linkedin: parseInt(process.env.LEMONSQUEEZY_EXTENSION_VARIANT_ID ?? "0", 10) || 0,
    x: parseInt(process.env.LEMONSQUEEZY_X_VARIANT_ID ?? "", 10) || X_EXTENSION_VARIANT_ID,
  }
}

type SubscriptionFields = {
  lsSubscriptionId: string
  lsCustomerId: string | null
  lsVariantId: string | null
  status: string
  renewsAt: Date | null
  endsAt: Date | null
  customerPortalUrl: string | null
}

// The table each extension's subscription lives in.
function subscriptions(platform: BillingPlatform) {
  if (platform === "x") {
    return {
      bySubscription: (lsSubscriptionId: string) =>
        db.xSubscription.findUnique({ where: { lsSubscriptionId }, select: { userId: true } }),
      currentFor: (userId: string) => db.xSubscription.findUnique({ where: { userId }, select: { lsSubscriptionId: true } }),
      save: (userId: string, fields: SubscriptionFields) =>
        db.xSubscription.upsert({ where: { userId }, create: { userId, ...fields }, update: fields }),
    }
  }
  return {
    bySubscription: (lsSubscriptionId: string) =>
      db.extensionSubscription.findUnique({ where: { lsSubscriptionId }, select: { userId: true } }),
    currentFor: (userId: string) =>
      db.extensionSubscription.findUnique({ where: { userId }, select: { lsSubscriptionId: true } }),
    save: (userId: string, fields: SubscriptionFields) =>
      db.extensionSubscription.upsert({ where: { userId }, create: { userId, ...fields }, update: fields }),
  }
}

// Which extension this event is about: the payload's own signals, else the
// table its subscription is already stored in (renewal invoices carry
// neither). null: not an extension event.
export async function extensionWebhookPlatform(payload: ExtensionWebhookPayload): Promise<BillingPlatform | null> {
  const fromPayload = extensionPlatformOfPayload(payload, variantIds())
  if (fromPayload) return fromPayload
  const subId = subscriptionIdOf(payload)
  if (!subId) return null
  if (await subscriptions("linkedin").bySubscription(subId)) return "linkedin"
  if (await subscriptions("x").bySubscription(subId)) return "x"
  return null
}

export async function isExtensionWebhook(payload: ExtensionWebhookPayload): Promise<boolean> {
  return (await extensionWebhookPlatform(payload)) !== null
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
  const platform = await extensionWebhookPlatform(payload)
  if (!platform) {
    console.error(`[extensionBilling] ${eventName}: not an extension event — needs manual review`)
    return
  }
  const table = subscriptions(platform)

  if (eventName === "subscription_payment_success") {
    await payReferralCommission(payload, platform)
    return
  }

  // Other invoices and the order behind a new subscription need no action:
  // every change to access arrives as a subscription_* state event.
  if (!SUBSCRIPTION_STATE_EVENTS.has(eventName)) {
    console.log(`[extensionBilling] ${platform} ${eventName}: no action needed`)
    return
  }

  const subId = subscriptionIdOf(payload)
  if (!subId) {
    console.error(`[extensionBilling] ${platform} ${eventName}: no subscription id — needs manual review`)
    return
  }

  const customUserId = payload.meta?.custom_data?.user_id
  const stored = await table.bySubscription(subId)
  let userId = stored?.userId ?? null
  if (!userId && typeof customUserId === "string" && customUserId) {
    const user = await db.user.findUnique({ where: { id: customUserId }, select: { id: true } })
    userId = user?.id ?? null
  }
  if (!userId) {
    console.error(`[extensionBilling] ${platform} ${eventName}: can't identify the buyer of subscription ${subId} — needs manual review`)
    return
  }

  const current = await table.currentFor(userId)
  if (!shouldApplyToStored(current?.lsSubscriptionId ?? null, subId, eventName)) {
    console.log(`[extensionBilling] ${platform} ${eventName}: subscription ${subId} is older than the one stored for ${userId}, ignored`)
    return
  }

  const attrs = (payload.data?.attributes ?? {}) as SubscriptionAttributes
  const fields: SubscriptionFields = {
    lsSubscriptionId: subId,
    lsCustomerId: attrs.customer_id != null ? String(attrs.customer_id) : null,
    lsVariantId: attrs.variant_id != null ? String(attrs.variant_id) : null,
    status: attrs.status ?? "active",
    renewsAt: asDate(attrs.renews_at),
    endsAt: asDate(attrs.ends_at),
    customerPortalUrl: attrs.urls?.customer_portal ?? null,
  }
  await table.save(userId, fields)
  console.log(`[extensionBilling] ${platform} ${eventName}: user ${userId} → ${fields.status}`)
}

// Referrers earn 8% of every extension payment, the same as for a web plan
// (lib/referral.ts). Each successful invoice — the first payment and every
// renewal — is one commission; the invoice's own id is the key that makes a
// redelivered event a no-op instead of a double payout.
async function payReferralCommission(payload: ExtensionWebhookPayload, platform: BillingPlatform): Promise<void> {
  const invoiceId = payload.data?.id
  const subId = subscriptionIdOf(payload)
  const stored = subId ? await subscriptions(platform).bySubscription(subId) : null
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
    console.log(`[extensionBilling] ${platform} payment ${invoiceId}: referral commission ${result}`)
  } catch (err) {
    // Best effort, like the web plans': access was never tied to this.
    console.error(`[extensionBilling] payment ${invoiceId}: referral commission failed:`, err)
  }
}
