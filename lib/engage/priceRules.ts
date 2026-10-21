// lib/engage/priceRules.ts — what one person pays for an Engage extension.
// Everyone pays the plan's price (lib/plans.ts, $15/month) unless an admin
// set a special price for them on that extension (EngagePrice, lib/engage/
// price.ts): either every month, or as an intro offer for their first 1–12
// monthly payments, then the usual price. Until its end date passes (and,
// for an intro offer, until they've bought with it) it's the price they see
// everywhere. Pure, so it's tested directly.
import { EXTENSION_PLAN, X_EXTENSION_PLAN } from "@/lib/plans"
import type { EngagePlatform } from "@/lib/engage/features"

export const STANDARD_PRICE_CENTS: Record<EngagePlatform, number> = {
  linkedin: Math.round(EXTENSION_PLAN.price * 100),
  x: Math.round(X_EXTENSION_PLAN.price * 100),
}

// What an admin may set. Lemon Squeezy needs a positive price; the ceiling
// only catches a slip of the keyboard (500 meant as 5.00).
export const MIN_PRICE_CENTS = 100
export const MAX_PRICE_CENTS = 99_900
export const MAX_INTRO_MONTHS = 12

export interface EngagePriceInfo {
  // What this person pays per month, in cents.
  cents: number
  // The plan's usual price.
  standardCents: number
  // An admin set this price for them and it can still be bought at.
  special: boolean
  // The last moment to buy at the special price; null = no end date.
  endsAt: string | null
  // An intro offer: `cents` only for this many first monthly payments, then
  // `standardCents`. null = `cents` every month.
  introMonths: number | null
}

export type StoredPrice = {
  priceCents: number
  endsAt: Date | null
  introMonths?: number | null
  introUsedAt?: Date | null
}

export function standardPrice(platform: EngagePlatform): EngagePriceInfo {
  const cents = STANDARD_PRICE_CENTS[platform]
  return { cents, standardCents: cents, special: false, endsAt: null, introMonths: null }
}

// A special price counts while its end date is ahead; one equal to the usual
// price is no special price at all. An intro offer must be cheaper than the
// usual price, and is spent once they've bought with it.
export function priceFor(platform: EngagePlatform, stored: StoredPrice | null, now: Date): EngagePriceInfo {
  const usual = standardPrice(platform)
  if (!stored) return usual
  if (stored.endsAt && stored.endsAt.getTime() <= now.getTime()) return usual
  const introMonths = stored.introMonths ?? null
  if (introMonths !== null ? stored.introUsedAt || stored.priceCents >= usual.cents : stored.priceCents === usual.cents) return usual
  return { ...usual, cents: stored.priceCents, special: true, endsAt: stored.endsAt?.toISOString() ?? null, introMonths }
}

// "$5", "$4.99".
export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`
}

export const monthlyLabel = (cents: number) => `${formatUsd(cents)}/month`

// The price in a few words, for a button: "$5/month", "$1 first month",
// "$1/month for 3 months".
export function shortPriceLabel(price: EngagePriceInfo): string {
  if (!price.introMonths) return monthlyLabel(price.cents)
  return price.introMonths === 1
    ? `${formatUsd(price.cents)} first month`
    : `${monthlyLabel(price.cents)} for ${price.introMonths} months`
}

// The whole offer, for a sentence: "$5/month", "$1 for your first month,
// then $15/month", "$1/month for your first 3 months, then $15/month".
export function offerLabel(price: EngagePriceInfo): string {
  if (!price.introMonths) return monthlyLabel(price.cents)
  const intro =
    price.introMonths === 1
      ? `${formatUsd(price.cents)} for your first month`
      : `${monthlyLabel(price.cents)} for your first ${price.introMonths} months`
  return `${intro}, then ${monthlyLabel(price.standardCents)}`
}

// Dollars as an admin types them ("5", "4.99", "$5") to cents; null when it
// isn't a price.
export function parseDollars(input: string): number | null {
  const match = input.trim().replace(/^\$\s*/, "").match(/^(\d{1,6})(?:\.(\d{1,2}))?$/)
  if (!match) return null
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
}
