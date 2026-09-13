// lib/credits.ts
import { db } from "@/lib/db"

const FREE_LIFETIME_CREDITS = 25
const MONTHLY_CREDITS = 1000

type CreditSub = {
  plan: "FREE" | "PRO" | "GROWTH"
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
  const extra = extraCreditsValid(sub) ? sub.extraCredits : 0
  // FREE users don't have a monthly allowance — they draw down a one-time
  // lifetime pool instead. An admin can still grant them extraCredits
  // directly (see app/api/admin/users/[userId]/credits) — those must count
  // here too, on top of whatever's left of the lifetime pool, or a manual
  // grant is stored but never actually usable.
  if (sub.plan === "FREE") return Math.max(0, FREE_LIFETIME_CREDITS - sub.creditsUsed) + extra
  const monthly = Math.max(0, sub.creditsTotal - sub.creditsUsed)
  return monthly + extra
}

// Defense-in-depth check for generation routes: a user whose balance is fully
// drained (FREE's lifetime pool or PRO/GROWTH's monthly allowance) is blocked
// server-side even if the client skipped the consume call.
export async function hasGenerationBalance(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } })
  if (!sub) return false
  return availableCredits(sub) > 0
}

// Atomically consume `amount` credits (weighted credit system: different
// actions cost different amounts — see lib/creditActions.ts).
//
// FREE users spend against a one-time lifetime pool (FREE_LIFETIME_CREDITS)
// instead of a monthly allowance; PRO/GROWTH spend against their monthly
// allowance (sub.creditsTotal). Once that primary allowance — lifetime or
// monthly — is exhausted, both fall back to valid extraCredits the same way.
// Deduction is atomic via conditional updateMany guards so concurrent
// requests can't overdraw; when the amount must be split across the primary
// allowance + extras, the two steps run in a transaction with optimistic
// guards and fall through to a clean failure if a concurrent request raced.
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

  const extraGuard = {
    OR: [{ extraCreditsExpiry: null }, { extraCreditsExpiry: { gt: new Date() } }],
  }

  // FREE's lifetime pool and PRO/GROWTH's monthly allowance are both just a
  // ceiling on creditsUsed — same shape, different number — so both plans
  // share the exact same try-primary / try-extras / split logic below.
  const ceiling = sub.plan === "FREE" ? FREE_LIFETIME_CREDITS : sub.creditsTotal

  // 1) try the whole amount from the primary allowance. The conditional where
  // clause makes check-and-decrement atomic.
  const primaryRes = await db.subscription.updateMany({
    where: { userId, creditsUsed: { lte: ceiling - amount } },
    data: { creditsUsed: { increment: amount } },
  })
  if (primaryRes.count > 0) {
    return {
      ok: true,
      requiresUpgrade: false,
      remaining: availableCredits({ ...sub, creditsUsed: sub.creditsUsed + amount }),
    }
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

  // 3) split: drain what's left of the primary allowance, take the rest from
  // extras. Optimistic guards (creditsUsed unchanged since our read, extras
  // still sufficient) make a concurrent race abort the transaction cleanly.
  const primaryLeft = Math.max(0, ceiling - sub.creditsUsed)
  const fromExtras = amount - primaryLeft
  if (primaryLeft > 0 && fromExtras > 0 && extraCreditsValid(sub) && sub.extraCredits >= fromExtras) {
    try {
      await db.$transaction(async (tx) => {
        const m = await tx.subscription.updateMany({
          where: { userId, creditsUsed: sub.creditsUsed },
          data: { creditsUsed: { increment: primaryLeft } },
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
          creditsUsed: sub.creditsUsed + primaryLeft,
          extraCredits: sub.extraCredits - fromExtras,
        }),
      }
    } catch {
      // raced with a concurrent consume — treat as insufficient
    }
  }

  // Can't cover the amount. FREE users are told to upgrade; PRO/GROWTH buy
  // extra credits instead.
  return { ok: false, requiresUpgrade: sub.plan === "FREE", remaining: availableCredits(sub) }
}

export { MONTHLY_CREDITS, FREE_LIFETIME_CREDITS }
