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
export function planForVariantId(variantId: number | undefined): "PRO" | "GROWTH" {
  const growthVariantId = parseInt(process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID ?? "0", 10)
  return growthVariantId > 0 && variantId === growthVariantId ? "GROWTH" : "PRO"
}

export function creditsForPlan(plan: "PRO" | "GROWTH"): number {
  return plan === "GROWTH" ? GROWTH_MONTHLY_CREDITS : PRO_MONTHLY_CREDITS
}
