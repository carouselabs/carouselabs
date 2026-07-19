// lib/refundCredits.ts — SERVER-ONLY. Refunds a charge when generation fails
// after credits were already consumed, so users never pay for a 502.
import { db } from "@/lib/db"
import { CREDIT_COSTS, type CreditAction } from "@/lib/creditActions"

// Refund `count` charges of `action`. Best-effort — a refund failure is logged,
// never thrown, so it can't mask the original generation error.
export async function refundCreditsForAction(
  userId: string,
  action: CreditAction,
  count = 1,
): Promise<void> {
  try {
    const sub = await db.subscription.findUnique({ where: { userId } })
    if (!sub) return

    // FREE users are charged 1 lifetime post per chargeable action, whatever
    // the action's listed price — refund the same way.
    const amount = sub.plan === "FREE" ? 1 : (CREDIT_COSTS[action] ?? 0) * count
    if (amount <= 0) return

    // Undo a monthly-allowance charge first (charges hit monthly before
    // extras). Guarded so creditsUsed can never go below 0.
    const res = await db.subscription.updateMany({
      where: { userId, creditsUsed: { gte: amount } },
      data: { creditsUsed: { decrement: amount } },
    })
    if (res.count === 0 && sub.plan === "PRO") {
      // The charge (or part of it) came out of extra credits — return it there.
      await db.subscription.updateMany({
        where: { userId },
        data: { extraCredits: { increment: amount } },
      })
    }

    console.log(`[credits] Refunded ${amount} credits to user ${userId} for failed ${action}`)
  } catch (err) {
    console.error("[credits] refund failed:", err)
  }
}
