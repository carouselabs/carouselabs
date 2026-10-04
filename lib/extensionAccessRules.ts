// lib/extensionAccessRules.ts — the browser extension's paywall rules, with
// no database or framework imports so they can be unit-tested directly
// (browser-extension-comment/tests/unit/extensionAccessRules.test.ts).
// lib/extAccess.ts and lib/extensionBilling.ts apply them.

// Free generations per account, for life. Every model-backed extension
// action counts: Generate, Regenerate, Reply, Shorter/Longer, connection
// notes, messages, and the profile builder's Test.
export const EXT_FREE_GENERATIONS = 10

export const EXT_PRICE_LABEL = "$15/month"

// Lemon Squeezy statuses that keep a paid subscription usable. past_due
// covers the few days Lemon Squeezy spends retrying a failed card.
const USABLE_STATUSES = new Set(["active", "on_trial", "past_due"])

export function isExtensionSubscriptionActive(
  sub: { status: string; endsAt: Date | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sub) return false
  if (USABLE_STATUSES.has(sub.status)) return true
  // A cancelled subscription keeps working until the period already paid for ends.
  return sub.status === "cancelled" && !!sub.endsAt && sub.endsAt.getTime() > now.getTime()
}

export interface ExtensionWebhookPayload {
  meta?: { event_name?: string; custom_data?: Record<string, unknown> }
  data?: {
    id?: string
    type?: string
    attributes?: {
      variant_id?: number
      subscription_id?: number
      first_order_item?: { variant_id?: number }
      [key: string]: unknown
    }
  }
}

// The Lemon Squeezy subscription this event is about: a subscription
// event's own id, or an invoice's parent subscription.
export function subscriptionIdOf(payload: ExtensionWebhookPayload): string | null {
  const attrs = payload.data?.attributes ?? {}
  if (payload.data?.type === "subscription-invoices" || attrs.subscription_id != null) {
    return attrs.subscription_id != null ? String(attrs.subscription_id) : null
  }
  if (payload.data?.type === "subscriptions" || payload.meta?.event_name?.startsWith("subscription_")) {
    return payload.data?.id ?? null
  }
  return null
}

// Whether a webhook is (certainly) about the extension subscription from the
// payload alone: the checkout marker the extension stamps, or the extension
// product's variant. The caller also treats an event as the extension's when
// its subscription id is already stored as one (renewal invoices carry
// neither signal).
export function isExtensionPayload(payload: ExtensionWebhookPayload, extensionVariantId: number): boolean {
  if (payload.meta?.custom_data?.kind === "extension") return true
  if (!extensionVariantId) return false
  const attrs = payload.data?.attributes ?? {}
  return attrs.variant_id === extensionVariantId || attrs.first_order_item?.variant_id === extensionVariantId
}

// The two extensions are sold separately, each its own Lemon Squeezy product.
export type BillingPlatform = "linkedin" | "x"

// Which extension's subscription a webhook is about, from the payload alone:
// the marker the checkout stamps (kind "extension" for LinkedIn, "x_extension"
// for X), else the product's variant. null: neither (a web plan, a top-up, or
// a renewal invoice, which carries no signal; the caller then looks the
// subscription up in both tables).
export function extensionPlatformOfPayload(
  payload: ExtensionWebhookPayload,
  variants: { linkedin: number; x: number },
): BillingPlatform | null {
  const kind = payload.meta?.custom_data?.kind
  if (kind === "x_extension") return "x"
  if (kind === "extension") return "linkedin"
  const attrs = payload.data?.attributes ?? {}
  const variant = attrs.variant_id ?? attrs.first_order_item?.variant_id
  if (variants.x && variant === variants.x) return "x"
  if (variants.linkedin && variant === variants.linkedin) return "linkedin"
  return null
}

// Events can arrive late or out of order. Once a user has a newer
// subscription stored, an event about an older one must not overwrite it —
// a late "expired" for last month's subscription would otherwise cut off the
// new one. Only subscription_created may replace the stored subscription.
export function shouldApplyToStored(
  storedSubscriptionId: string | null,
  eventSubscriptionId: string,
  eventName: string,
): boolean {
  if (!storedSubscriptionId || storedSubscriptionId === eventSubscriptionId) return true
  return eventName === "subscription_created"
}
