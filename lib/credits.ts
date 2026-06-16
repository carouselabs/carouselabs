// lib/credits.ts
import { db } from "@/lib/db"

const FREE_LIFETIME_POSTS = 1
const MONTHLY_CREDITS = 30

type CreditSub = {
  plan: "FREE" | "PRO"
  creditsUsed: number
  creditsTotal: number
  extraCredits: number
  extraCreditsExpiry: Date | null
}

// Extra credits only count while they haven't expired.
export function extraCreditsValid(sub: Pick<CreditSub, "extraCredits" | "extraCreditsExpiry">): boolean {
  if (sub.extraCredits <= 0) return false
  if (!sub.extraCreditsExpiry) return true
  return sub.extraCreditsExpiry.getTime() > Date.now()
}

// How many credits the user can still spend right now.
export function availableCredits(sub: CreditSub): number {
  if (sub.plan === "FREE") return Math.max(0, FREE_LIFETIME_POSTS - sub.creditsUsed)
  const monthly = Math.max(0, sub.creditsTotal - sub.creditsUsed)
  const extra = extraCreditsValid(sub) ? sub.extraCredits : 0
  return monthly + extra
}

// Atomically consume one credit. Free users get one lifetime post; Pro users
// spend their monthly allowance first, then valid extra credits.
export async function consumeCredit(
  userId: string,
): Promise<{ ok: boolean; requiresUpgrade: boolean }> {
  const sub = await db.subscription.findUnique({ where: { userId } })
  if (!sub) return { ok: false, requiresUpgrade: true }

  if (sub.plan === "FREE") {
    if (sub.creditsUsed >= FREE_LIFETIME_POSTS) return { ok: false, requiresUpgrade: true }
    await db.subscription.update({
      where: { userId },
      data: { creditsUsed: { increment: 1 } },
    })
    return { ok: true, requiresUpgrade: false }
  }

  // PRO — spend monthly credits first.
  const monthlyRemaining = sub.creditsTotal - sub.creditsUsed
  if (monthlyRemaining > 0) {
    await db.subscription.update({
      where: { userId },
      data: { creditsUsed: { increment: 1 } },
    })
    return { ok: true, requiresUpgrade: false }
  }
  // Then valid extra credits.
  if (extraCreditsValid(sub)) {
    await db.subscription.update({
      where: { userId },
      data: { extraCredits: { decrement: 1 } },
    })
    return { ok: true, requiresUpgrade: false }
  }
  // Pro user is out of everything — they buy extra credits, not "upgrade".
  return { ok: false, requiresUpgrade: false }
}

export { MONTHLY_CREDITS, FREE_LIFETIME_POSTS }
