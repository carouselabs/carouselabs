// lib/extensionCheckout.ts — the Lemon Squeezy checkout link for an
// extension's $15/month subscription (LinkedIn and X are separate products),
// shared by the side panels (app/api/ext/checkout) and the website
// (app/checkout/extension).
//
// The link carries the account's id: the webhook (lib/extensionBilling.ts)
// credits the subscription to custom_data.user_id, never to the email typed
// at checkout, so a purchase can't land on the wrong account.
//
// Someone an admin gave a special price (lib/engage/price.ts) gets a checkout
// made for them at that price instead of the shared link.
import { db } from "@/lib/db"
import { isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"
import { signBillingIdentity } from "@/lib/billingIdentity"
import { extensionVariantIds } from "@/lib/extensionBilling"
import { X_EXTENSION_CHECKOUT_URL } from "@/lib/plans"
import { loadEngagePrice } from "@/lib/engage/price"
import { discountCodeFor, variantPriceCents } from "@/lib/engage/priceDiscount"
import type { EngagePlatform } from "@/lib/engage/features"

export type ExtensionCheckout =
  | { kind: "checkout"; url: string }
  // A second checkout would start a second, double-billed subscription.
  | { kind: "subscribed"; manageUrl: string | null }
  | { kind: "unavailable" }

export async function extensionCheckoutFor(
  user: { id: string; email: string },
  platform: EngagePlatform = "linkedin",
): Promise<ExtensionCheckout> {
  const sub =
    platform === "x"
      ? await db.xSubscription.findUnique({ where: { userId: user.id } })
      : await db.extensionSubscription.findUnique({ where: { userId: user.id } })
  if (isExtensionSubscriptionActive(sub)) return { kind: "subscribed", manageUrl: sub?.customerPortalUrl ?? null }

  // Each extension is its own product: its own checkout link and variant.
  // X's are public and have built-in defaults (lib/plans.ts).
  const base =
    platform === "x"
      ? process.env.LEMONSQUEEZY_X_CHECKOUT_URL || X_EXTENSION_CHECKOUT_URL
      : process.env.LEMONSQUEEZY_EXTENSION_CHECKOUT_URL
  const variant = extensionVariantIds()[platform]
  if (!base || !variant || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    console.error(`[extensionCheckout] ${platform} checkout configuration is incomplete`)
    return { kind: "unavailable" }
  }

  const custom = {
    user_id: user.id,
    // Binds the purchase to this account for this product: the webhook
    // accepts the user id only with this signature (lib/extensionBilling.ts).
    identity_signature: signBillingIdentity(user.id, String(variant)),
    // Informational only: the webhook decides the product by its variant.
    kind: platform === "x" ? "x_extension" : "extension",
  }

  const price = await loadEngagePrice(user.id, platform)
  if (price.special) {
    // Never fall back to the shared link: it would charge the usual price to
    // someone who was promised less.
    const url = await specialPriceCheckoutUrl({
      userId: user.id,
      platform,
      variant,
      cents: price.cents,
      email: user.email,
      custom,
      expiresAt: checkoutExpiry(price.endsAt ? new Date(price.endsAt) : null, new Date()),
    })
    return url ? { kind: "checkout", url } : { kind: "unavailable" }
  }

  let url: URL
  try { url = new URL(base) } catch { return { kind: "unavailable" } }
  if (url.protocol !== "https:") return { kind: "unavailable" }
  url.searchParams.set("checkout[email]", user.email)
  for (const [key, value] of Object.entries(custom)) url.searchParams.set(`checkout[custom][${key}]`, value)
  return { kind: "checkout", url: url.toString() }
}

// A checkout made for one person is opened straight away, so it needn't
// last: a day, or less when their special price ends sooner.
const CHECKOUT_LIFETIME_MS = 24 * 60 * 60 * 1000

export function checkoutExpiry(priceEndsAt: Date | null, now: Date): Date {
  const dayLater = new Date(now.getTime() + CHECKOUT_LIFETIME_MS)
  return priceEndsAt && priceEndsAt < dayLater ? priceEndsAt : dayLater
}

// The shared checkout link always charges the product's own price, so a
// special price needs a checkout of its own (Lemon Squeezy's Create Checkout
// API). It carries the person's own discount from the product's price
// (lib/engage/priceDiscount.ts), which the checkout shows as such. When
// there's nothing to take off (the product already costs that or less) or
// no discount can be made, a custom_price instead: the same charge, now and
// at every renewal, with the product's usual price still printed beside it.
// null when no checkout can be made (not configured, or Lemon Squeezy said no).
export async function specialPriceCheckoutUrl(input: {
  userId: string
  platform: EngagePlatform
  variant: number
  cents: number
  email: string
  custom: Record<string, string>
  expiresAt: Date
}): Promise<string | null> {
  const store = process.env.LEMONSQUEEZY_STORE_ID
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!store || !apiKey) {
    console.error("[extensionCheckout] special price checkout needs LEMONSQUEEZY_STORE_ID and LEMONSQUEEZY_API_KEY")
    return null
  }
  const listCents = await variantPriceCents(input.variant)
  const code =
    listCents !== null && listCents > input.cents
      ? await discountCodeFor({
          userId: input.userId,
          platform: input.platform,
          variant: input.variant,
          offCents: listCents - input.cents,
        }).catch(() => null)
      : null
  const charge = code
    ? { checkout_data: { email: input.email, custom: input.custom, discount_code: code } }
    : { custom_price: input.cents, checkout_data: { email: input.email, custom: input.custom } }
  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            ...charge,
            product_options: { enabled_variants: [input.variant] },
            expires_at: input.expiresAt.toISOString(),
          },
          relationships: {
            store: { data: { type: "stores", id: String(store) } },
            variant: { data: { type: "variants", id: String(input.variant) } },
          },
        },
      }),
    })
    if (!res.ok) {
      console.error(`[extensionCheckout] Lemon Squeezy refused a special price checkout (${res.status})`)
      return null
    }
    const body = (await res.json().catch(() => null)) as { data?: { attributes?: { url?: unknown } } } | null
    const url = body?.data?.attributes?.url
    return typeof url === "string" && url.startsWith("https://") ? url : null
  } catch {
    console.error("[extensionCheckout] couldn't reach Lemon Squeezy for a special price checkout")
    return null
  }
}
