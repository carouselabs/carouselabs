// lib/extensionBilling.ts — Lemon Squeezy webhooks for the two extensions'
// $15/month subscriptions, sold separately: CarouseLabs Engage for LinkedIn
// (ExtensionSubscription) and CarouseLabs Engage for X (XSubscription).
// app/api/webhooks/lemonsqueezy calls isExtensionWebhook FIRST and hands
// matching events here, before any of its web-plan handling: that code finds
// the buyer by email and maps an unknown variant to Pro, so an extension
// purchase would otherwise grant web Pro — and its expiry would downgrade the
// buyer's real web plan to Free.
//
// Which product an event is about comes from its variant (or the table its
// subscription is already stored in), never from checkout metadata: the
// buyer can edit that, and it must not turn another product into access.
//
// The buyer is identified by meta.custom_data.user_id, accepted only with the
// identity signature the checkout stamped for that product's variant
// (lib/billingIdentity.ts), or by the subscription already stored for them —
// never by the checkout email, which the buyer can type freely (same rule as
// the credit top-ups).
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { verifyBillingIdentity } from "@/lib/billingIdentity"
import { createCommissionForPayment } from "@/lib/referral"
import { X_EXTENSION_VARIANT_ID } from "@/lib/plans"
import {
  extensionPlatformOfPayload,
  shouldApplyToStored,
  subscriptionIdOf,
  type BillingPlatform,
  type ExtensionWebhookPayload,
} from "@/lib/extensionAccessRules"

export function extensionVariantIds(): Record<BillingPlatform, number> {
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

// The table each extension's subscription lives in, through the caller's
// client (the webhook's transaction).
function subscriptions(platform: BillingPlatform, client: Prisma.TransactionClient) {
  if (platform === "x") {
    return {
      bySubscription: (lsSubscriptionId: string) =>
        client.xSubscription.findUnique({ where: { lsSubscriptionId }, select: { userId: true } }),
      currentFor: (userId: string) => client.xSubscription.findUnique({ where: { userId }, select: { lsSubscriptionId: true } }),
      save: (userId: string, fields: SubscriptionFields) =>
        client.xSubscription.upsert({ where: { userId }, create: { userId, ...fields }, update: fields }),
    }
  }
  return {
    bySubscription: (lsSubscriptionId: string) =>
      client.extensionSubscription.findUnique({ where: { lsSubscriptionId }, select: { userId: true } }),
    currentFor: (userId: string) =>
      client.extensionSubscription.findUnique({ where: { userId }, select: { lsSubscriptionId: true } }),
    save: (userId: string, fields: SubscriptionFields) =>
      client.extensionSubscription.upsert({ where: { userId }, create: { userId, ...fields }, update: fields }),
  }
}

// Which extension this event is about: the product's variant, else the table
// its subscription is already stored in (renewal invoices carry no variant).
// null: not an extension event.
export async function extensionWebhookPlatform(
  payload: ExtensionWebhookPayload,
  client: Prisma.TransactionClient = db,
): Promise<BillingPlatform | null> {
  const fromVariant = extensionPlatformOfPayload(payload, extensionVariantIds())
  if (fromVariant) return fromVariant
  const subId = subscriptionIdOf(payload)
  if (!subId) return null
  if (await subscriptions("linkedin", client).bySubscription(subId)) return "linkedin"
  if (await subscriptions("x", client).bySubscription(subId)) return "x"
  return null
}

export async function isExtensionWebhook(payload: ExtensionWebhookPayload, client: Prisma.TransactionClient = db): Promise<boolean> {
  return (await extensionWebhookPlatform(payload, client)) !== null
}

// The buyer named by the checkout, accepted only with that product's
// signature (a link for one product can't claim the other).
async function signedBuyer(
  payload: ExtensionWebhookPayload,
  platform: BillingPlatform,
  client: Prisma.TransactionClient,
): Promise<string | null> {
  const customUserId = payload.meta?.custom_data?.user_id
  if (typeof customUserId !== "string" || !customUserId) return null
  const variant = String(extensionVariantIds()[platform])
  if (!verifyBillingIdentity(customUserId, variant, payload.meta?.custom_data?.identity_signature)) {
    throw new Error("Invalid extension checkout identity")
  }
  return (await client.user.findUnique({ where: { id: customUserId }, select: { id: true } }))?.id ?? null
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

export async function handleExtensionWebhook(payload: ExtensionWebhookPayload, client: Prisma.TransactionClient = db): Promise<void> {
  const eventName = payload.meta?.event_name ?? ""
  const platform = await extensionWebhookPlatform(payload, client)
  if (!platform) {
    console.error(`[extensionBilling] ${eventName}: not an extension event — needs manual review`)
    return
  }
  const table = subscriptions(platform, client)

  if (eventName === "subscription_payment_success") {
    await payReferralCommission(payload, platform, client)
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

  const stored = await table.bySubscription(subId)
  const userId = stored?.userId ?? (await signedBuyer(payload, platform, client))
  if (!userId) {
    // Thrown, not logged: the event is retried rather than lost.
    throw new Error("Extension subscription owner unavailable; retry or reconcile checkout")
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
async function payReferralCommission(
  payload: ExtensionWebhookPayload,
  platform: BillingPlatform,
  client: Prisma.TransactionClient,
): Promise<void> {
  const invoiceId = payload.data?.id
  const subId = subscriptionIdOf(payload)
  const stored = subId ? await subscriptions(platform, client).bySubscription(subId) : null
  // The first payment can arrive before subscription_created has stored the
  // subscription; the signed id stamped at checkout identifies the buyer then.
  const userId = stored?.userId ?? (await signedBuyer(payload, platform, client))
  if (!userId || !invoiceId) {
    throw new Error("Extension payment owner unavailable; retry after subscription creation")
  }

  const attrs = (payload.data?.attributes ?? {}) as { subtotal?: number; total?: number }
  try {
    const result = await createCommissionForPayment(
      {
        referredUserId: userId,
        sourceOrderId: invoiceId,
        // Pre-tax, like the web plans' commissions.
        subtotalCents: attrs.subtotal ?? attrs.total ?? 0,
        sourceEvent: "subscription_payment_success",
      },
      client,
    )
    console.log(`[extensionBilling] ${platform} payment ${invoiceId}: referral commission ${result}`)
  } catch (err) {
    // Best effort, like the web plans': access was never tied to this.
    console.error(`[extensionBilling] payment ${invoiceId}: referral commission failed:`, err)
  }
}
