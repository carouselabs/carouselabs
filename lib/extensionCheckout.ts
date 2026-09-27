// lib/extensionCheckout.ts — the Lemon Squeezy checkout link for the
// extension's $15/month subscription, shared by the side panel
// (app/api/ext/checkout) and the website (app/checkout/extension).
//
// The link carries the account's id: the webhook (lib/extensionBilling.ts)
// credits the subscription to custom_data.user_id, never to the email typed
// at checkout, so a purchase can't land on the wrong account.
import { db } from "@/lib/db"
import { isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"

export type ExtensionCheckout =
  | { kind: "checkout"; url: string }
  // A second checkout would start a second, double-billed subscription.
  | { kind: "subscribed"; manageUrl: string | null }
  | { kind: "unavailable" }

export async function extensionCheckoutFor(user: { id: string; email: string }): Promise<ExtensionCheckout> {
  const sub = await db.extensionSubscription.findUnique({ where: { userId: user.id } })
  if (isExtensionSubscriptionActive(sub)) return { kind: "subscribed", manageUrl: sub?.customerPortalUrl ?? null }

  const base = process.env.LEMONSQUEEZY_EXTENSION_CHECKOUT_URL
  if (!base) {
    console.error("[extensionCheckout] LEMONSQUEEZY_EXTENSION_CHECKOUT_URL is not set")
    return { kind: "unavailable" }
  }

  const url = new URL(base)
  url.searchParams.set("checkout[email]", user.email)
  url.searchParams.set("checkout[custom][user_id]", user.id)
  url.searchParams.set("checkout[custom][kind]", "extension")
  return { kind: "checkout", url: url.toString() }
}
