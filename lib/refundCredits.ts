import { db } from "@/lib/db"
import type { CreditReceipt } from "@/lib/credits"

// Request-scoped receipts prevent duplicate failure handlers from refunding
// twice. A durable ledger is still needed for process-crash recovery.
export async function refundCreditsForAction(receipt: CreditReceipt | undefined): Promise<void> {
  if (!receipt || receipt.refunded) return
  receipt.refunded = true
  try {
    await db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({ where: { userId: receipt.userId } })
      if (!sub) throw new Error("Subscription missing during refund")
      const samePeriod = sub.currentPeriodStart?.getTime() === receipt.periodStart?.getTime()
      // Never refund an old-period debit against new-period usage.
      const primary = samePeriod ? receipt.primary : 0
      const sameExtraPool = sub.extraCreditsExpiry?.getTime() === receipt.extraExpiry?.getTime()
      const originalExtrasStillValid = !receipt.extraExpiry || receipt.extraExpiry.getTime() > Date.now()
      const currentExtrasStillValid = !sub.extraCreditsExpiry || sub.extraCreditsExpiry.getTime() > Date.now()
      const extra = (sameExtraPool || (originalExtrasStillValid && currentExtrasStillValid)) ? receipt.extra : 0
      if (!primary && !extra) return
      const result = await tx.subscription.updateMany({
        where: {
          userId: receipt.userId, currentPeriodStart: sub.currentPeriodStart,
          extraCreditsExpiry: sub.extraCreditsExpiry, creditsUsed: { gte: primary },
        },
        data: { creditsUsed: { decrement: primary }, extraCredits: { increment: extra } },
      })
      if (!result.count) throw new Error("Credit refund raced a billing update")
    })
  } catch {
    receipt.refunded = false
    console.error("[credits] Refund failed; manual reconciliation required", { userId: receipt.userId })
  }
}
