// lib/chargeCredits.ts — SERVER-ONLY charge helper for generation routes.
// Wraps the atomic consumeCredits with the PRO low-balance / exhausted email
// notifications (fired on threshold crossings, best-effort).
import { consumeCredits } from "@/lib/credits"
import { CREDIT_COSTS, type CreditAction } from "@/lib/creditActions"
import { sendCreditsLowEmail, sendCreditsExhaustedEmail } from "@/lib/email"

const LOW_BALANCE_THRESHOLD = 100

interface ChargeUser {
  id: string
  email: string
  profile?: { name?: string | null } | null
  subscription?: { plan?: string | null } | null
}

export async function chargeCreditsForAction(
  user: ChargeUser,
  action: CreditAction,
): Promise<{ ok: boolean; remaining: number; requiresUpgrade: boolean }> {
  const cost = CREDIT_COSTS[action]
  const result = await consumeCredits(user.id, cost)
  if (!result.ok) {
    return { ok: false, remaining: result.remaining, requiresUpgrade: result.requiresUpgrade }
  }

  if ((user.subscription?.plan ?? "FREE") === "PRO") {
    const before = result.remaining + cost
    const name = user.profile?.name ?? ""
    try {
      if (result.remaining === 0) {
        await sendCreditsExhaustedEmail(user.email, name)
      } else if (before > LOW_BALANCE_THRESHOLD && result.remaining <= LOW_BALANCE_THRESHOLD) {
        await sendCreditsLowEmail(user.email, name, result.remaining)
      }
    } catch (err) {
      console.error("[credits] balance email failed:", err)
    }
  }

  return { ok: true, remaining: result.remaining, requiresUpgrade: false }
}
