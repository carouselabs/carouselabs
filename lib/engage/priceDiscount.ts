// lib/engage/priceDiscount.ts — a special price (lib/engage/price.ts) at
// checkout. It's applied as the person's own Lemon Squeezy discount, so the
// checkout reads "$15.00 billed every month, discount, $5.00": a custom price
// would charge the same but still show the usual "$15.00 billed every month"
// beside it. One discount per person and extension: once-only, limited to
// that extension, taking off the difference for every payment ("forever"),
// or for an intro offer only the first N monthly payments ("repeating"),
// after which Lemon Squeezy charges the usual price. Made at their first
// checkout and remembered on their price row so later checkouts reuse it.
//
// Deliberately cautious where Lemon Squeezy's docs are silent: a discount
// gets no expiry date of its own (the special price's end date is enforced
// by this app no longer offering it), and one is only ever deleted when
// nobody has redeemed it.
import crypto from "node:crypto"
import { db } from "@/lib/db"
import { markIntroUsed } from "@/lib/engage/priceIntro"
import type { EngagePlatform } from "@/lib/engage/features"

const API = "https://api.lemonsqueezy.com/v1"
const NAMES: Record<EngagePlatform, string> = { linkedin: "Engage for LinkedIn", x: "Engage for X" }

type LemonAnswer = { ok: boolean; status: number; body: { data?: unknown } | null }

async function lemon(method: string, path: string, body?: unknown): Promise<LemonAnswer> {
  const res = await fetch(`${API}/${path}`, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
      Accept: "application/vnd.api+json",
      ...(body === undefined ? {} : { "Content-Type": "application/vnd.api+json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
}

// What the extension's product costs in Lemon Squeezy right now, in cents;
// null when it can't be read. The discount is the difference from this, so
// the checkout total always comes to the special price.
export async function variantPriceCents(variant: number): Promise<number | null> {
  try {
    const answer = await lemon("GET", `variants/${variant}`)
    const price = (answer.body?.data as { attributes?: { price?: unknown } } | undefined)?.attributes?.price
    return answer.ok && typeof price === "number" ? price : null
  } catch {
    return null
  }
}

// Whether anyone has redeemed this discount. Unknown counts as yes, so a
// used code is never offered again or deleted.
async function redeemed(discountId: string): Promise<boolean> {
  try {
    const answer = await lemon("GET", `discount-redemptions?filter[discount_id]=${encodeURIComponent(discountId)}&page[size]=1`)
    return !answer.ok || !Array.isArray(answer.body?.data) || answer.body.data.length > 0
  } catch {
    return true
  }
}

const CODE_LETTERS: Record<EngagePlatform, string> = { linkedin: "L", x: "X" }

// "CLL" / "CLX" and 10 random letters and digits: uppercase letters and
// numbers are all Lemon Squeezy allows, and nothing in it names the person.
export function newDiscountCode(platform: EngagePlatform): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.randomBytes(10)
  return `CL${CODE_LETTERS[platform]}${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`
}

async function createDiscount(
  platform: EngagePlatform,
  variant: number,
  offCents: number,
  months: number | null,
): Promise<{ id: string; code: string } | null> {
  const code = newDiscountCode(platform)
  try {
    const answer = await lemon("POST", "discounts", {
      data: {
        type: "discounts",
        attributes: {
          name: `Special price, ${NAMES[platform]}`,
          code,
          amount: offCents,
          amount_type: "fixed",
          ...(months ? { duration: "repeating", duration_in_months: months } : { duration: "forever" }),
          is_limited_to_products: true,
          is_limited_redemptions: true,
          max_redemptions: 1,
        },
        relationships: {
          store: { data: { type: "stores", id: String(process.env.LEMONSQUEEZY_STORE_ID) } },
          variants: { data: [{ type: "variants", id: String(variant) }] },
        },
      },
    })
    const id = (answer.body?.data as { id?: unknown } | undefined)?.id
    if (!answer.ok || (typeof id !== "string" && typeof id !== "number")) {
      console.error(`[priceDiscount] Lemon Squeezy refused a discount (${answer.status})`)
      return null
    }
    return { id: String(id), code }
  } catch {
    console.error("[priceDiscount] couldn't reach Lemon Squeezy to make a discount")
    return null
  }
}

/**
 * The person's discount code for their special price on this extension:
 * the remembered one while it's unused and still takes off `offCents`,
 * otherwise a new one (an unused old one is deleted). `months`: an intro
 * offer's length (null: every month). An intro whose code was already
 * redeemed is spent: { spent: true }, and they pay the usual price. null
 * when Lemon Squeezy can't make one.
 */
export async function discountCodeFor(input: {
  userId: string
  platform: EngagePlatform
  variant: number
  offCents: number
  months: number | null
}): Promise<{ code: string } | { spent: true } | null> {
  const where = { userId_platform: { userId: input.userId, platform: input.platform } }
  const row = await db.engagePrice.findUnique({ where })
  if (!row) return null

  if (row.lemonDiscountId && row.lemonDiscountCode) {
    const used = await redeemed(row.lemonDiscountId)
    if (used && input.months) {
      // They bought with their intro offer (the webhook marks this too).
      await markIntroUsed(input.userId, input.platform)
      return { spent: true }
    }
    if (!used && row.lemonDiscountCents === input.offCents) return { code: row.lemonDiscountCode }
    if (!used) await deleteDiscount(row.lemonDiscountId)
  }

  const made = await createDiscount(input.platform, input.variant, input.offCents, input.months)
  if (!made) return null
  // Only onto the price it was made for: if an admin changed it meanwhile,
  // the next checkout makes a fresh one.
  await db.engagePrice.updateMany({
    where: { userId: input.userId, platform: input.platform, priceCents: row.priceCents },
    data: { lemonDiscountId: made.id, lemonDiscountCode: made.code, lemonDiscountCents: input.offCents },
  })
  return { code: made.code }
}

async function deleteDiscount(discountId: string): Promise<void> {
  try {
    const answer = await lemon("DELETE", `discounts/${encodeURIComponent(discountId)}`)
    if (!answer.ok && answer.status !== 404) console.error(`[priceDiscount] couldn't delete an unused discount (${answer.status})`)
  } catch {
    console.error("[priceDiscount] couldn't reach Lemon Squeezy to delete an unused discount")
  }
}

// A special price was changed or removed: its discount is no longer offered,
// and is deleted from Lemon Squeezy if nobody used it (a used one stays, so
// the subscription it's on is never touched). Never throws.
export async function retireDiscount(discountId: string | null | undefined): Promise<void> {
  if (!discountId || !process.env.LEMONSQUEEZY_API_KEY) return
  if (!(await redeemed(discountId))) await deleteDiscount(discountId)
}
