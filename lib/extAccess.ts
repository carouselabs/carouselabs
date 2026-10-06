// lib/extAccess.ts — who may generate with the browser extensions, applied by
// every model-backed app/api/ext route: an active $15/month subscription or
// an admin grant (unlimited, with the fair-use cooldown in
// lib/extDailyLimit.ts behind it), or one of the account's free uses
// (EXT_FREE_GENERATIONS, or what an admin set for this user).
//
// LinkedIn and X are sold separately: each extension has its own
// subscription (ExtensionSubscription / XSubscription) and its own free
// uses ("User".extensionTrialUsed / xTrialUsed).
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
import { ENGAGE_FEATURES, type EngageFeature, type EngagePlatform } from "@/lib/engage/features"

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
  // Features an admin has switched off for this user are false. A feature
  // paused for everyone (Controls) isn't: the panel's Account screen lists
  // these as "turned off for this account", and a pause says so itself when
  // someone tries to use it.
  features: Record<EngageFeature, boolean>
}

const ALL_ON = Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, true])) as Record<EngageFeature, boolean>

// The stored subscription for one extension.
function findSubscription(userId: string, platform: EngagePlatform) {
  return platform === "x"
    ? db.xSubscription.findUnique({ where: { userId } })
    : db.extensionSubscription.findUnique({ where: { userId } })
}

// One extension's plan, for the panel (/api/ext/me) and the website.
export async function extAccessSummary(userId: string, platform: EngagePlatform = "linkedin"): Promise<ExtAccessSummary> {
  const sub = await findSubscription(userId, platform).catch((err) => {
    // The X table not there yet (scripts/x-billing.sql not run): no X subscription.
    if (platform === "x" && isEngageSchemaMissing(err)) return null
    throw err
  })
  const billing = {
    status: sub?.status ?? null,
    renewsAt: sub?.renewsAt?.toISOString() ?? null,
    endsAt: sub?.endsAt?.toISOString() ?? null,
    manageUrl: sub?.customerPortalUrl ?? null,
  }

  try {
    const loaded = await loadEngageAccess(userId)
    if (loaded) {
      const paywall = loaded.platforms[platform]
      return {
        access: paywall.access,
        freeUsed: paywall.freeUsed,
        freeLimit: loaded.freeGenerations.effective,
        ...billing,
        source: paywall.source,
        grantEndsAt: paywall.source === "grant" ? (paywall.activeGrant?.endsAt?.toISOString() ?? null) : null,
        suspended: loaded.status !== "active",
        features: Object.fromEntries(
          ENGAGE_FEATURES.map((f) => [f, loaded.features[f].override !== "off"]),
        ) as Record<EngageFeature, boolean>,
      }
    }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    console.error("[extAccess] Engage admin tables missing — run the Engage admin SQL. Using plan rules only.")
  }

  // Plan rules only: the Engage admin tables aren't there yet.
  const used = await freeUsedOf(userId, platform)
  const access = !COMMENT_CREDITS_ENFORCED ? "testing" : isExtensionSubscriptionActive(sub) ? "unlimited" : "free"
  return {
    access,
    freeUsed: Math.min(used, EXT_FREE_GENERATIONS),
    freeLimit: EXT_FREE_GENERATIONS,
    ...billing,
    source: access === "unlimited" ? "subscription" : access,
    grantEndsAt: null,
    suspended: false,
    features: ALL_ON,
  }
}

async function freeUsedOf(userId: string, platform: EngagePlatform): Promise<number> {
  if (platform === "x") {
    const user = await db.user.findUnique({ where: { id: userId }, select: { xTrialUsed: true } }).catch(() => null)
    return user?.xTrialUsed ?? 0
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } })
  return user?.extensionTrialUsed ?? 0
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

// A release that gives back at most once, however many times it is called: a
// cancelled request can be reported more than once (the client's abort, the
// stream's cancel, a failed write), and a second decrement would hand the
// user a free generation they never had.
export function onlyOnce(release: () => Promise<void>): () => Promise<void> {
  let done: Promise<void> | null = null
  return () => (done ??= release())
}

const PRODUCT_NAMES: Record<EngagePlatform, string> = {
  linkedin: "CarouseLabs Engage for LinkedIn",
  x: "CarouseLabs Engage for X",
}

function paywallResponse(freeLimit: number, platform: EngagePlatform): NextResponse {
  return NextResponse.json(
    {
      error: `You've used your ${freeLimit} free generations. Get unlimited with ${PRODUCT_NAMES[platform]} for ${EXT_PRICE_LABEL} to keep going.`,
      requiresSubscription: true,
    },
    { status: 402 },
  )
}

// Takes one of the user's free generations on this extension, atomically, so
// two requests racing on the last one can't both get it.
export async function reserveFreeGeneration(
  userId: string,
  freeLimit: number,
  platform: EngagePlatform = "linkedin",
): Promise<ExtGenerationGate> {
  if (platform === "x") {
    const { count } = await db.user.updateMany({
      where: { id: userId, xTrialUsed: { lt: freeLimit } },
      data: { xTrialUsed: { increment: 1 } },
    })
    if (count === 0) return { ok: false, response: paywallResponse(freeLimit, platform) }
    const after = await db.user.findUnique({ where: { id: userId }, select: { xTrialUsed: true } })
    return {
      ok: true,
      freeRemaining: Math.max(0, freeLimit - (after?.xTrialUsed ?? freeLimit)),
      release: onlyOnce(async () => {
        await db.user
          .updateMany({ where: { id: userId, xTrialUsed: { gt: 0 } }, data: { xTrialUsed: { decrement: 1 } } })
          .catch((err) => console.error("[extAccess] failed to give back a free X generation:", err))
      }),
    }
  }

  const { count } = await db.user.updateMany({
    where: { id: userId, extensionTrialUsed: { lt: freeLimit } },
    data: { extensionTrialUsed: { increment: 1 } },
  })
  if (count === 0) return { ok: false, response: paywallResponse(freeLimit, platform) }

  const after = await db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } })
  return {
    ok: true,
    freeRemaining: Math.max(0, freeLimit - (after?.extensionTrialUsed ?? freeLimit)),
    release: onlyOnce(async () => {
      await db.user
        .updateMany({ where: { id: userId, extensionTrialUsed: { gt: 0 } }, data: { extensionTrialUsed: { decrement: 1 } } })
        .catch((err) => console.error("[extAccess] failed to give back a free generation:", err))
    }),
  }
}

// The plan rules alone (subscription, else the 10 free generations), with no
// admin controls. The gate (lib/engage/gate.ts) falls back to this only while
// the Engage admin tables don't exist yet.
export async function reserveExtGeneration(userId: string, platform: EngagePlatform = "linkedin"): Promise<ExtGenerationGate> {
  if (!COMMENT_CREDITS_ENFORCED) return { ok: true, freeRemaining: null, release: noop }

  const sub = await findSubscription(userId, platform)
  if (isExtensionSubscriptionActive(sub)) return { ok: true, freeRemaining: null, release: noop }

  return reserveFreeGeneration(userId, EXT_FREE_GENERATIONS, platform)
}
