// lib/extensionCheckout.ts — the Lemon Squeezy checkout link for an
// extension's $15/month subscription (LinkedIn and X are separate products),
// shared by the side panels (app/api/ext/checkout) and the website
// (app/checkout/extension).
//
// The link carries the account's id: the webhook (lib/extensionBilling.ts)
// credits the subscription to custom_data.user_id, never to the email typed
// at checkout, so a purchase can't land on the wrong account.
import { db } from "@/lib/db"
import { isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"
import { signBillingIdentity } from "@/lib/billingIdentity"
import { extensionVariantIds } from "@/lib/extensionBilling"
import { X_EXTENSION_CHECKOUT_URL } from "@/lib/plans"
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

  let url: URL
  try { url = new URL(base) } catch { return { kind: "unavailable" } }
  if (url.protocol !== "https:") return { kind: "unavailable" }
  url.searchParams.set("checkout[email]", user.email)
  url.searchParams.set("checkout[custom][user_id]", user.id)
  // Binds the purchase to this account for this product: the webhook accepts
  // the user id only with this signature (lib/extensionBilling.ts).
  url.searchParams.set("checkout[custom][identity_signature]", signBillingIdentity(user.id, String(variant)))
  // Informational only: the webhook decides the product by its variant.
  url.searchParams.set("checkout[custom][kind]", platform === "x" ? "x_extension" : "extension")
  return { kind: "checkout", url: url.toString() }
}
