// lib/credits.ts
import { db } from "@/lib/db"

const FREE_LIFETIME_POSTS = 1
const MONTHLY_CREDITS = 1000

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

// Defense-in-depth check for generation routes: a PRO user whose balance is
// fully drained is blocked server-side even if the client skipped the consume
// call. FREE users aren't blocked here — their single lifetime post is enforced
// at consumption time and their regenerations are free by design.
export async function hasGenerationBalance(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } })
  if (!sub) return false
  if (sub.plan === "FREE") return true
  return availableCredits(sub) > 0
}

// Atomically consume `amount` credits (weighted credit system: different
// actions cost different amounts — see lib/creditActions.ts).
//
// FREE users don't have weighted credits: any chargeable action consumes their
// single lifetime post, whatever `amount` was requested.
//
// PRO users spend their monthly allowance first, then valid extra credits.
// Deduction is atomic via conditional updateMany guards so concurrent requests
// can't overdraw; when the amount must be split across monthly + extras, the
// two steps run in a transaction with optimistic guards and fall through to a
// clean failure if a concurrent request raced.
//
// `remaining` is the available balance AFTER this call (current balance on a
// failed consume), so callers can fire low-balance / exhausted notifications.
export async function consumeCredits(
  userId: string,
  amount: number,
): Promise<{ ok: boolean; requiresUpgrade: boolean; remaining: number }> {
  const sub = await db.subscription.findUnique({ where: { userId } })
  if (!sub) return { ok: false, requiresUpgrade: true, remaining: 0 }

  if (amount <= 0) {
    return { ok: true, requiresUpgrade: false, remaining: availableCredits(sub) }
  }

  if (sub.plan === "FREE") {
    // Atomic: only the row that still has a free post left is incremented, so
    // concurrent requests can't both slip past the lifetime limit.
    const res = await db.subscription.updateMany({
      where: { userId, creditsUsed: { lt: FREE_LIFETIME_POSTS } },
      data: { creditsUsed: { increment: 1 } },
    })
    if (res.count === 0) return { ok: false, requiresUpgrade: true, remaining: 0 }
    return {
      ok: true,
      requiresUpgrade: false,
      remaining: availableCredits({ ...sub, creditsUsed: sub.creditsUsed + 1 }),
    }
  }

  // PRO — 1) try the whole amount from the monthly allowance. The conditional
  // where clause makes check-and-decrement atomic.
  const monthlyRes = await db.subscription.updateMany({
    where: { userId, creditsUsed: { lte: sub.creditsTotal - amount } },
    data: { creditsUsed: { increment: amount } },
  })
  if (monthlyRes.count > 0) {
    return {
      ok: true,
      requiresUpgrade: false,
      remaining: availableCredits({ ...sub, creditsUsed: sub.creditsUsed + amount }),
    }
  }

  const extraGuard = {
    OR: [{ extraCreditsExpiry: null }, { extraCreditsExpiry: { gt: new Date() } }],
  }

  // 2) try the whole amount from valid extra credits.
  if (extraCreditsValid(sub)) {
    const extraRes = await db.subscription.updateMany({
      where: { userId, extraCredits: { gte: amount }, ...extraGuard },
      data: { extraCredits: { decrement: amount } },
    })
    if (extraRes.count > 0) {
      return {
        ok: true,
        requiresUpgrade: false,
        remaining: availableCredits({ ...sub, extraCredits: sub.extraCredits - amount }),
      }
    }
  }

  // 3) split: drain what's left of the monthly allowance, take the rest from
  // extras. Optimistic guards (creditsUsed unchanged since our read, extras
  // still sufficient) make a concurrent race abort the transaction cleanly.
  const monthlyLeft = Math.max(0, sub.creditsTotal - sub.creditsUsed)
  const fromExtras = amount - monthlyLeft
  if (monthlyLeft > 0 && fromExtras > 0 && extraCreditsValid(sub) && sub.extraCredits >= fromExtras) {
    try {
      await db.$transaction(async (tx) => {
        const m = await tx.subscription.updateMany({
          where: { userId, creditsUsed: sub.creditsUsed },
          data: { creditsUsed: { increment: monthlyLeft } },
        })
        if (m.count === 0) throw new Error("credit split raced")
        const e = await tx.subscription.updateMany({
          where: { userId, extraCredits: { gte: fromExtras }, ...extraGuard },
          data: { extraCredits: { decrement: fromExtras } },
        })
        if (e.count === 0) throw new Error("credit split raced")
      })
      return {
        ok: true,
        requiresUpgrade: false,
        remaining: availableCredits({
          ...sub,
          creditsUsed: sub.creditsUsed + monthlyLeft,
          extraCredits: sub.extraCredits - fromExtras,
        }),
      }
    } catch {
      // raced with a concurrent consume — treat as insufficient
    }
  }

  // Pro user can't cover the amount — they buy extra credits, not "upgrade".
  return { ok: false, requiresUpgrade: false, remaining: availableCredits(sub) }
}

export { MONTHLY_CREDITS, FREE_LIFETIME_POSTS }
