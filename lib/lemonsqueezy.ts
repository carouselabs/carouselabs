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

// Pro plan price in USD cents ($24/month). Used for display/email copy only —
// the authoritative amount lives in the Lemon Squeezy product configuration.
export const PRO_MONTHLY_PRICE_CENTS = 2400
