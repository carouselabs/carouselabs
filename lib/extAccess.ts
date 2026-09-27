// lib/extAccess.ts — who may generate with the browser extension, applied by
// every model-backed app/api/ext route: an active $15/month extension
// subscription (unlimited, with the fair-use cooldown in lib/extDailyLimit.ts
// behind it), or one of the account's EXT_FREE_GENERATIONS free uses.
//
// COMMENT_CREDITS_ENFORCED=false (local testing only, lib/commentCredits.ts)
// switches the paywall off entirely.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { COMMENT_CREDITS_ENFORCED } from "@/lib/commentCredits"
import { EXT_FREE_GENERATIONS, EXT_PRICE_LABEL, isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"

export interface ExtAccessSummary {
  access: "unlimited" | "free" | "testing"
  freeUsed: number
  freeLimit: number
  status: string | null
  renewsAt: string | null
  endsAt: string | null
  manageUrl: string | null
}

export async function extAccessSummary(userId: string): Promise<ExtAccessSummary> {
  const [user, sub] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } }),
    db.extensionSubscription.findUnique({ where: { userId } }),
  ])
  const freeUsed = Math.min(user?.extensionTrialUsed ?? 0, EXT_FREE_GENERATIONS)
  const access = !COMMENT_CREDITS_ENFORCED ? "testing" : isExtensionSubscriptionActive(sub) ? "unlimited" : "free"
  return {
    access,
    freeUsed,
    freeLimit: EXT_FREE_GENERATIONS,
    status: sub?.status ?? null,
    renewsAt: sub?.renewsAt?.toISOString() ?? null,
    endsAt: sub?.endsAt?.toISOString() ?? null,
    manageUrl: sub?.customerPortalUrl ?? null,
  }
}

export type ExtGenerationGate =
  | {
      ok: true
      // Free uses left after this one; null when unlimited (or testing).
      freeRemaining: number | null
      // Gives the free use back — call when the generation fails, so a user
      // is never charged a free use for output they never got.
      release: () => Promise<void>
    }
  | { ok: false; response: NextResponse }

const noop = async () => {}

// Call once per request, after validating it and immediately before the model
// call. Reserves the free use atomically, so two requests racing on the last
// free use can't both get it.
export async function reserveExtGeneration(userId: string): Promise<ExtGenerationGate> {
  if (!COMMENT_CREDITS_ENFORCED) return { ok: true, freeRemaining: null, release: noop }

  const sub = await db.extensionSubscription.findUnique({ where: { userId } })
  if (isExtensionSubscriptionActive(sub)) return { ok: true, freeRemaining: null, release: noop }

  const { count } = await db.user.updateMany({
    where: { id: userId, extensionTrialUsed: { lt: EXT_FREE_GENERATIONS } },
    data: { extensionTrialUsed: { increment: 1 } },
  })
  if (count === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `You've used your ${EXT_FREE_GENERATIONS} free generations. Get unlimited for ${EXT_PRICE_LABEL} to keep going.`,
          requiresSubscription: true,
        },
        { status: 402 },
      ),
    }
  }

  const after = await db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } })
  return {
    ok: true,
    freeRemaining: Math.max(0, EXT_FREE_GENERATIONS - (after?.extensionTrialUsed ?? EXT_FREE_GENERATIONS)),
    release: async () => {
      await db.user
        .updateMany({ where: { id: userId, extensionTrialUsed: { gt: 0 } }, data: { extensionTrialUsed: { decrement: 1 } } })
        .catch((err) => console.error("[extAccess] failed to give back a free generation:", err))
    },
  }
}
