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

// Server-created receipt: never accept from a client. Restore the exact pools.
export type CreditReceipt = {
  userId: string
  primary: number
  extra: number
  periodStart: Date | null
  extraExpiry: Date | null
  refunded?: boolean
}

export function extraCreditsValid(sub: Pick<CreditSub, "extraCredits" | "extraCreditsExpiry">): boolean {
  return sub.extraCredits > 0 && (!sub.extraCreditsExpiry || sub.extraCreditsExpiry.getTime() > Date.now())
}

export function availableCredits(sub: CreditSub): number {
  const ceiling = sub.plan === "FREE" ? FREE_LIFETIME_CREDITS : sub.creditsTotal
  return Math.max(0, ceiling - sub.creditsUsed) + (extraCreditsValid(sub) ? sub.extraCredits : 0)
}

export async function hasGenerationBalance(userId: string): Promise<boolean> {
  const sub = await db.subscription.findUnique({ where: { userId } })
  return !!sub && availableCredits(sub) > 0
}

export async function consumeCredits(userId: string, amount: number): Promise<{
  ok: boolean; requiresUpgrade: boolean; remaining: number; receipt?: CreditReceipt
}> {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid credit amount")
  // Compare-and-swap covers the entire billing snapshot. Retry only a failed
  // CAS, for which no debit or external action occurred.
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId } })
      if (!sub) return { ok: false, requiresUpgrade: true, remaining: 0 }
      const balance = availableCredits(sub)
      if (balance < amount) return { ok: false, requiresUpgrade: sub.plan === "FREE", remaining: balance }
      const ceiling = sub.plan === "FREE" ? FREE_LIFETIME_CREDITS : sub.creditsTotal
      const primary = Math.min(amount, Math.max(0, ceiling - sub.creditsUsed))
      const extra = amount - primary
      const updated = await tx.subscription.updateMany({
        where: {
          userId, plan: sub.plan, creditsUsed: sub.creditsUsed,
          creditsTotal: sub.creditsTotal, extraCredits: sub.extraCredits,
          extraCreditsExpiry: sub.extraCreditsExpiry, currentPeriodStart: sub.currentPeriodStart,
          ...(extra > 0 ? { OR: [{ extraCreditsExpiry: null }, { extraCreditsExpiry: { gt: new Date() } }] } : {}),
        },
        data: { creditsUsed: { increment: primary }, extraCredits: { decrement: extra } },
      })
      if (!updated.count) return null
      return {
        ok: true, requiresUpgrade: false, remaining: balance - amount,
        receipt: { userId, primary, extra, periodStart: sub.currentPeriodStart, extraExpiry: sub.extraCreditsExpiry },
      }
    })
    if (result) return result
  }
  throw new Error("Credit balance changed repeatedly; please retry")
}

export { MONTHLY_CREDITS, FREE_LIFETIME_CREDITS }
