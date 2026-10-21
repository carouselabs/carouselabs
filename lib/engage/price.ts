// lib/engage/price.ts — reading and setting the special prices an admin gives
// one person for an Engage extension (EngagePrice; the rules are in
// lib/engage/priceRules.ts). Until scripts/engage-price.sql has been run the
// table isn't there, and everyone simply gets the usual price.
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { retireDiscount } from "@/lib/engage/priceDiscount"
import { formatUsd, priceFor, standardPrice, type EngagePriceInfo } from "@/lib/engage/priceRules"
import type { EngagePlatform } from "@/lib/engage/features"

const PLATFORMS: EngagePlatform[] = ["linkedin", "x"]

// The stored rows, or none while the table doesn't exist yet.
async function storedPrices(userId: string) {
  try {
    return await db.engagePrice.findMany({ where: { userId } })
  } catch (err) {
    if (isEngageSchemaMissing(err)) return []
    throw err
  }
}

// What this person pays for each extension.
export async function loadEngagePrices(userId: string, now: Date = new Date()): Promise<Record<EngagePlatform, EngagePriceInfo>> {
  const rows = await storedPrices(userId)
  return Object.fromEntries(
    PLATFORMS.map((p) => [p, priceFor(p, rows.find((r) => r.platform === p) ?? null, now)]),
  ) as Record<EngagePlatform, EngagePriceInfo>
}

export async function loadEngagePrice(userId: string, platform: EngagePlatform, now: Date = new Date()): Promise<EngagePriceInfo> {
  return (await loadEngagePrices(userId, now))[platform]
}

// For the admin: each extension's stored special price (also one whose end
// date has passed, so they can see it ended), and what the person pays now.
export async function adminEngagePrices(userId: string, now: Date = new Date()) {
  const rows = await storedPrices(userId)
  return PLATFORMS.map((platform) => {
    const row = rows.find((r) => r.platform === platform) ?? null
    return {
      platform,
      now: priceFor(platform, row, now),
      standardCents: standardPrice(platform).cents,
      special: row && {
        priceCents: row.priceCents,
        // An intro offer: that many first months, then the usual price.
        introMonths: row.introMonths,
        introUsedAt: row.introUsedAt,
        endsAt: row.endsAt,
        reason: row.reason,
        setBy: row.setBy,
        updatedAt: row.updatedAt,
        // The Lemon Squeezy discount its checkout uses, once one was made.
        discountCode: row.lemonDiscountCode,
        ended: !!row.endsAt && row.endsAt.getTime() <= now.getTime(),
      },
    }
  })
}

const NAMES: Record<EngagePlatform, string> = { linkedin: "LinkedIn", x: "X" }

function describe(platform: EngagePlatform, cents: number, introMonths: number | null, endsAt: Date | null): string {
  const charge = introMonths ? `${formatUsd(cents)}/month for the first ${introMonths} month${introMonths === 1 ? "" : "s"}, then the usual price` : `${formatUsd(cents)}/month`
  return `${NAMES[platform]} price ${charge}${endsAt ? `, offered until ${endsAt.toISOString().slice(0, 10)}` : ""}`
}

const snapshot = (platform: EngagePlatform, row: { priceCents: number; introMonths: number | null; endsAt: Date | null }) => ({
  platform,
  priceCents: row.priceCents,
  introMonths: row.introMonths,
  endsAt: row.endsAt?.toISOString() ?? null,
})

export async function setEngagePrice(input: {
  admin: string
  user: { id: string; email: string }
  platform: EngagePlatform
  priceCents: number
  // null: every month; 1–12: an intro offer for that many first months.
  introMonths: number | null
  endsAt: Date | null
  reason: string
  ip?: string
}) {
  const where = { userId_platform: { userId: input.user.id, platform: input.platform } }
  const before = await db.engagePrice.findUnique({ where })
  // A new amount or length needs a new checkout discount (lib/engage/priceDiscount.ts).
  const repriced = !!before && (before.priceCents !== input.priceCents || (before.introMonths ?? null) !== input.introMonths)
  const data = {
    priceCents: input.priceCents,
    introMonths: input.introMonths,
    // Saving an offer always makes it available again, even one they used.
    introUsedAt: null,
    endsAt: input.endsAt,
    reason: input.reason,
    setBy: input.admin,
    ...(repriced ? { lemonDiscountId: null, lemonDiscountCode: null, lemonDiscountCents: null } : {}),
  }
  const row = await db.engagePrice.upsert({
    where,
    create: { userId: input.user.id, platform: input.platform, ...data },
    update: data,
  })
  await logAdminAction({
    adminEmail: input.admin,
    action: "ENGAGE_SET_PRICE",
    targetUserId: input.user.id,
    targetEmail: input.user.email,
    details: `Set ${describe(input.platform, input.priceCents, input.introMonths, input.endsAt)}`,
    ipAddress: input.ip,
    product: "engage",
    oldValue: before && snapshot(input.platform, before),
    newValue: snapshot(input.platform, input),
    reason: input.reason,
  })
  if (repriced) await retireDiscount(before.lemonDiscountId)
  return row
}

// Back to the usual price. Returns false when there was no special price.
export async function removeEngagePrice(input: {
  admin: string
  user: { id: string; email: string }
  platform: EngagePlatform
  reason: string
  ip?: string
}): Promise<boolean> {
  const where = { userId_platform: { userId: input.user.id, platform: input.platform } }
  const before = await db.engagePrice.findUnique({ where })
  if (!before) return false
  await db.engagePrice.delete({ where })
  await logAdminAction({
    adminEmail: input.admin,
    action: "ENGAGE_REMOVE_PRICE",
    targetUserId: input.user.id,
    targetEmail: input.user.email,
    details: `Removed ${describe(input.platform, before.priceCents, before.introMonths, before.endsAt)}; back to the usual price`,
    ipAddress: input.ip,
    product: "engage",
    oldValue: snapshot(input.platform, before),
    newValue: null,
    reason: input.reason,
  })
  await retireDiscount(before.lemonDiscountId)
  return true
}
