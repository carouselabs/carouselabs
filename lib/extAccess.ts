// lib/extAccess.ts — who may generate with the browser extension, applied by
// every model-backed app/api/ext route: an active $15/month extension
// subscription or an admin grant (unlimited, with the fair-use cooldown in
// lib/extDailyLimit.ts behind it), or one of the account's free uses
// (EXT_FREE_GENERATIONS, or what an admin set for this user).
//
// The full set of rules, including the admin's per-user controls, lives in
// lib/engage/accessRules.ts; the routes go through lib/engage/gate.ts.
//
// COMMENT_CREDITS_ENFORCED=false (local testing only, lib/commentCredits.ts)
// switches the paywall off entirely.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { COMMENT_CREDITS_ENFORCED } from "@/lib/commentCredits"
import { EXT_FREE_GENERATIONS, EXT_PRICE_LABEL, isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"
import { isEngageSchemaMissing, loadEngageAccess } from "@/lib/engage/access"
import { ENGAGE_FEATURES, type EngageFeature } from "@/lib/engage/features"

export interface ExtAccessSummary {
  access: "unlimited" | "free" | "testing"
  freeUsed: number
  freeLimit: number
  status: string | null
  renewsAt: string | null
  endsAt: string | null
  manageUrl: string | null
  // Why access is what it is. "grant": an admin gave unlimited access,
  // until grantEndsAt (null = for life).
  source: "subscription" | "grant" | "free" | "testing"
  grantEndsAt: string | null
  // Engage paused for this account by an admin (or the account suspended).
  suspended: boolean
  // Features an admin has switched off for this user are false.
  features: Record<EngageFeature, boolean>
}

const ALL_ON = Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, true])) as Record<EngageFeature, boolean>

export async function extAccessSummary(userId: string): Promise<ExtAccessSummary> {
  const sub = await db.extensionSubscription.findUnique({ where: { userId } })
  const billing = {
    status: sub?.status ?? null,
    renewsAt: sub?.renewsAt?.toISOString() ?? null,
    endsAt: sub?.endsAt?.toISOString() ?? null,
    manageUrl: sub?.customerPortalUrl ?? null,
  }

  try {
    const access = await loadEngageAccess(userId)
    if (access) {
      return {
        access: access.access,
        freeUsed: access.freeUsed,
        freeLimit: access.freeGenerations.effective,
        ...billing,
        source: access.source,
        grantEndsAt: access.source === "grant" ? (access.activeGrant?.endsAt?.toISOString() ?? null) : null,
        suspended: access.status !== "active",
        features: Object.fromEntries(
          ENGAGE_FEATURES.map((f) => [f, access.features[f].enabled]),
        ) as Record<EngageFeature, boolean>,
      }
    }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    console.error("[extAccess] Engage admin tables missing — run scripts/engage-admin-schema.sql. Using plan rules only.")
  }

  // Plan rules only: the Engage admin tables aren't there yet.
  const user = await db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } })
  const access = !COMMENT_CREDITS_ENFORCED ? "testing" : isExtensionSubscriptionActive(sub) ? "unlimited" : "free"
  return {
    access,
    freeUsed: Math.min(user?.extensionTrialUsed ?? 0, EXT_FREE_GENERATIONS),
    freeLimit: EXT_FREE_GENERATIONS,
    ...billing,
    source: access === "unlimited" ? "subscription" : access,
    grantEndsAt: null,
    suspended: false,
    features: ALL_ON,
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

// Takes one of the user's free generations, atomically, so two requests
// racing on the last one can't both get it.
export async function reserveFreeGeneration(userId: string, freeLimit: number): Promise<ExtGenerationGate> {
  const { count } = await db.user.updateMany({
    where: { id: userId, extensionTrialUsed: { lt: freeLimit } },
    data: { extensionTrialUsed: { increment: 1 } },
  })
  if (count === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `You've used your ${freeLimit} free generations. Get unlimited for ${EXT_PRICE_LABEL} to keep going.`,
          requiresSubscription: true,
        },
        { status: 402 },
      ),
    }
  }

  const after = await db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } })
  return {
    ok: true,
    freeRemaining: Math.max(0, freeLimit - (after?.extensionTrialUsed ?? freeLimit)),
    release: async () => {
      await db.user
        .updateMany({ where: { id: userId, extensionTrialUsed: { gt: 0 } }, data: { extensionTrialUsed: { decrement: 1 } } })
        .catch((err) => console.error("[extAccess] failed to give back a free generation:", err))
    },
  }
}

// The plan rules alone (subscription, else the 10 free generations), with no
// admin controls. The gate (lib/engage/gate.ts) falls back to this only while
// the Engage admin tables don't exist yet.
export async function reserveExtGeneration(userId: string): Promise<ExtGenerationGate> {
  if (!COMMENT_CREDITS_ENFORCED) return { ok: true, freeRemaining: null, release: noop }

  const sub = await db.extensionSubscription.findUnique({ where: { userId } })
  if (isExtensionSubscriptionActive(sub)) return { ok: true, freeRemaining: null, release: noop }

  return reserveFreeGeneration(userId, EXT_FREE_GENERATIONS)
}
