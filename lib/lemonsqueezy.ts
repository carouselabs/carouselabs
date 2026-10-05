// lib/lemonsqueezy.ts
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js"

// Configure the Lemon Squeezy SDK once per server invocation. Call this at the
// top of any route handler that talks to the Lemon Squeezy API (cancel, etc.).
export function initLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError: (error) => console.error("[LemonSqueezy]", error),
  })
}

export const PRO_MONTHLY_CREDITS = 1000
export const GROWTH_MONTHLY_CREDITS = 2000

// Prices in USD cents. Used for display/email copy only — the authoritative
// amount lives in the Lemon Squeezy product configuration.
export const PRO_MONTHLY_PRICE_CENTS = 2499
export const GROWTH_MONTHLY_PRICE_CENTS = 4599

// Lemon Squeezy sends the purchased variant's ID on subscription events —
// this is how we tell a Pro checkout from a Growth checkout apart (both are
// "subscription_created" with no other plan signal in the payload).
//
// Unknown products must never grant paid web-plan permissions.
export function planForVariantId(variantId: number | undefined): "PRO" | "GROWTH" {
  const growthVariantId = parseInt(process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID ?? "0", 10)
  const proVariantId = parseInt(process.env.LEMONSQUEEZY_VARIANT_ID ?? "0", 10)

  if (growthVariantId > 0 && variantId === growthVariantId) return "GROWTH"
  if (proVariantId > 0 && variantId === proVariantId) return "PRO"
  throw new Error("Unrecognized Lemon Squeezy web-plan variant")

}

export function creditsForPlan(plan: "PRO" | "GROWTH"): number {
  return plan === "GROWTH" ? GROWTH_MONTHLY_CREDITS : PRO_MONTHLY_CREDITS
}

// Schedules a Pro → Growth upgrade so the customer is charged the new price
// at their next renewal instead of today. `disable_prorations: true` is what
// makes this "scheduled": Lemon Squeezy swaps the variant on the subscription
// immediately (a subscription_updated webhook fires) but issues no prorated
// charge — the first Growth invoice lands at the next renewal. The webhook
// handler holds credits at the Pro allowance until that renewal payment.
export async function scheduleSubscriptionUpgrade(
  lsSubscriptionId: string,
  growthVariantId: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
      {
        method: "PATCH",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "subscriptions",
            id: lsSubscriptionId,
            attributes: {
              variant_id: parseInt(growthVariantId, 10),
              disable_prorations: true,
            },
          },
        }),
      },
    )

    if (!response.ok) {
      console.error("[lemonsqueezy] Failed to schedule upgrade:", await response.text())
      return false
    }

    console.log("[lemonsqueezy] Growth upgrade scheduled for next renewal")
    return true
  } catch (err) {
    console.error("[lemonsqueezy] scheduleSubscriptionUpgrade error:", err)
    return false
  }
}
