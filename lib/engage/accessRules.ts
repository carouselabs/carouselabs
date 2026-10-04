// lib/engage/accessRules.ts — one user's effective Engage access, from what
// is stored about them. Pure (no database, no framework), so every rule is
// unit-tested directly.
//
// The order, lowest to highest:
//   plan defaults        10 free generations, 450/day, every feature on
//   paused for everyone  a feature an admin paused for all users (Controls,
//                        lib/engage/settingsRules.ts): off whatever else says
//   subscription         $15/month (Lemon Squeezy) → unlimited; LinkedIn
//                        and X are sold separately, so each extension has
//                        its own subscription and its own free generations
//   user overrides       per-feature on/off, limits, free generations
//   admin grant          unlimited until a date, or for life
//   suspension           Engage-only or whole account: blocks everything
//
// The admin UI shows plan, override and effective value side by side, so
// "why can this user do that?" always has a visible answer.
import { z } from "zod"
import { isExtensionSubscriptionActive } from "@/lib/extensionAccessRules"
import {
  ENGAGE_FEATURES,
  ENGAGE_PLATFORMS,
  FEATURE_LABELS,
  LIMIT_KEYS,
  PLAN_FREE_GENERATIONS,
  planLimit,
  type EngageFeature,
  type EngagePlatform,
  type EngageUsageKind,
  type Limit,
  type LimitKey,
} from "@/lib/engage/features"
import { pausedMessage, type EngageGlobalSettings } from "@/lib/engage/settingsRules"

// ── Stored overrides, validated ─────────────────────────────────────────

const limitValue = z.union([z.literal("unlimited"), z.number().int().min(0).max(1_000_000)])

export const featureOverridesSchema = z.partialRecord(z.enum(ENGAGE_FEATURES), z.enum(["on", "off"]))
export const limitOverridesSchema = z.partialRecord(
  z.enum(LIMIT_KEYS as [LimitKey, ...LimitKey[]]),
  limitValue,
)

export type FeatureOverrides = z.infer<typeof featureOverridesSchema>
export type LimitOverrides = z.infer<typeof limitOverridesSchema>

// Stored JSON that fails validation (a hand edit, an older shape) counts as
// "no override" rather than breaking the user's access.
export function parseFeatureOverrides(value: unknown): FeatureOverrides {
  const parsed = featureOverridesSchema.safeParse(value ?? {})
  return parsed.success ? parsed.data : {}
}

export function parseLimitOverrides(value: unknown): LimitOverrides {
  const parsed = limitOverridesSchema.safeParse(value ?? {})
  return parsed.success ? parsed.data : {}
}

// ── Inputs and result ───────────────────────────────────────────────────

export interface GrantInput {
  id: string
  startsAt: Date
  endsAt: Date | null
  revokedAt: Date | null
  reason: string
  grantedBy: string
  createdAt: Date
  // Which extension it unlocks: "linkedin", "x" or "both" (absent: both).
  platform?: string
}

export interface EngageAccessInput {
  now: Date
  // false only while the paywall is switched off for local testing
  // (lib/commentCredits.ts). Admin controls still apply.
  paywallEnforced: boolean
  accountSuspendedAt: Date | null
  control: {
    features: unknown
    limits: unknown
    freeGenerations: number | null
    suspendedAt: Date | null
    suspendReason: string | null
  } | null
  // The LinkedIn extension's subscription, and the X extension's.
  subscription: { status: string; endsAt: Date | null } | null
  xSubscription?: { status: string; endsAt: Date | null } | null
  grants: GrantInput[]
  // Free generations used on LinkedIn, and on X.
  freeUsed: number
  xFreeUsed?: number
  // Settings for everyone (admin → Engage → Controls); absent means none.
  global?: Pick<EngageGlobalSettings, "features">
}

export interface LimitValue {
  plan: Limit
  override: Limit | null
  effective: Limit
}

export interface FeatureAccess {
  // Every feature is on in the plan; an override, or a pause for everyone,
  // turns one off.
  override: "on" | "off" | null
  // Paused for every user (Controls), with the message they see.
  paused: boolean
  pauseMessage: string | null
  enabled: boolean
}

// One extension's paywall: paid, granted, or counting its own free
// generations.
export interface PaywallAccess {
  access: "unlimited" | "free" | "testing"
  source: "subscription" | "grant" | "free" | "testing"
  subscriptionActive: boolean
  activeGrant: GrantInput | null
  freeUsed: number
  freeRemaining: number | null
}

export interface EngageAccess {
  status: "active" | "suspended" | "account_suspended"
  suspendReason: string | null
  // What the paywall sees: unlimited (paid or granted), free (counting the
  // free generations), or testing (paywall off).
  access: "unlimited" | "free" | "testing"
  source: "subscription" | "grant" | "free" | "testing"
  subscriptionActive: boolean
  activeGrant: GrantInput | null
  freeGenerations: { plan: number; override: number | null; effective: number }
  freeUsed: number
  // null when unlimited or testing: free generations don't apply.
  freeRemaining: number | null
  // Each extension's own paywall. The fields above are LinkedIn's, as before
  // the two were sold separately.
  platforms: Record<EngagePlatform, PaywallAccess>
  features: Record<EngageFeature, FeatureAccess>
  limits: Record<LimitKey, LimitValue>
}

export function grantCovers(grant: GrantInput, platform: EngagePlatform): boolean {
  const p = grant.platform ?? "both"
  return p === "both" || p === platform
}

export function isGrantActive(grant: GrantInput, now: Date): boolean {
  if (grant.revokedAt) return false
  if (grant.startsAt.getTime() > now.getTime()) return false
  return grant.endsAt === null || grant.endsAt.getTime() > now.getTime()
}

// The grant that applies when several overlap: a lifetime one, else the one
// that runs longest.
export function pickActiveGrant(grants: GrantInput[], now: Date): GrantInput | null {
  const active = grants.filter((g) => isGrantActive(g, now))
  if (active.length === 0) return null
  return active.reduce((best, g) => {
    if (best.endsAt === null) return best
    if (g.endsAt === null) return g
    return g.endsAt.getTime() > best.endsAt.getTime() ? g : best
  })
}

export function computeEngageAccess(input: EngageAccessInput): EngageAccess {
  const { now } = input
  const features = parseFeatureOverrides(input.control?.features)
  const limits = parseLimitOverrides(input.control?.limits)

  // The admin's free-generations override applies to each extension.
  const freeOverride = input.control?.freeGenerations ?? null
  const freeEffective = freeOverride ?? PLAN_FREE_GENERATIONS

  const paywall = (platform: EngagePlatform): PaywallAccess => {
    const subscriptionActive = isExtensionSubscriptionActive(
      platform === "x" ? (input.xSubscription ?? null) : input.subscription,
      now,
    )
    const activeGrant = pickActiveGrant(
      input.grants.filter((g) => grantCovers(g, platform)),
      now,
    )
    const source: PaywallAccess["source"] = !input.paywallEnforced
      ? "testing"
      : subscriptionActive
        ? "subscription"
        : activeGrant
          ? "grant"
          : "free"
    const access: PaywallAccess["access"] = source === "testing" ? "testing" : source === "free" ? "free" : "unlimited"
    const used = Math.max(0, platform === "x" ? (input.xFreeUsed ?? 0) : input.freeUsed)
    return {
      access,
      source,
      subscriptionActive,
      activeGrant,
      freeUsed: Math.min(used, freeEffective),
      freeRemaining: access === "free" ? Math.max(0, freeEffective - used) : null,
    }
  }
  const platforms = Object.fromEntries(ENGAGE_PLATFORMS.map((p) => [p, paywall(p)])) as Record<EngagePlatform, PaywallAccess>
  const { access, source, subscriptionActive, activeGrant } = platforms.linkedin

  const status: EngageAccess["status"] = input.accountSuspendedAt
    ? "account_suspended"
    : input.control?.suspendedAt
      ? "suspended"
      : "active"

  return {
    status,
    suspendReason: status === "suspended" ? (input.control?.suspendReason ?? null) : null,
    access,
    source,
    subscriptionActive,
    activeGrant,
    freeGenerations: { plan: PLAN_FREE_GENERATIONS, override: freeOverride, effective: freeEffective },
    freeUsed: platforms.linkedin.freeUsed,
    freeRemaining: platforms.linkedin.freeRemaining,
    platforms,
    features: Object.fromEntries(
      ENGAGE_FEATURES.map((f) => {
        const override = features[f] ?? null
        const paused = input.global ? !input.global.features[f].enabled : false
        return [
          f,
          {
            override,
            paused,
            pauseMessage: paused && input.global ? pausedMessage(f, input.global) : null,
            enabled: !paused && override !== "off",
          },
        ]
      }),
    ) as Record<EngageFeature, FeatureAccess>,
    limits: Object.fromEntries(
      LIMIT_KEYS.map((key) => {
        const plan = planLimit(key)
        const override = limits[key] ?? null
        return [key, { plan, override, effective: override ?? plan }]
      }),
    ) as Record<LimitKey, LimitValue>,
  }
}

// ── Decisions the gate makes ────────────────────────────────────────────

export interface Blocked {
  status: 403
  error: string
  code: "account_suspended" | "suspended" | "feature_disabled" | "feature_paused"
}

// Which features a usage kind needs. Shorter/Longer works on comments and
// replies alike, so either being on is enough; the profile Test previews a
// comment profile.
export function featuresFor(kind: EngageUsageKind): EngageFeature[] {
  if (kind === "rewrites") return ["comments", "replies"]
  if (kind === "tests") return ["comments"]
  if (kind === "x_rewrites" || kind === "x_tests") return ["x_replies"]
  return [kind]
}

// Whether this user may make this kind of generation at all (before limits
// and the paywall). kind null checks suspension only.
export function blockedReason(access: EngageAccess, kind: EngageUsageKind | null): Blocked | null {
  if (access.status === "account_suspended") {
    return { status: 403, code: "account_suspended", error: "This account is suspended." }
  }
  if (access.status === "suspended") {
    return {
      status: 403,
      code: "suspended",
      error: "Your CarouseLabs Engage access is paused. If you think this is a mistake, email support@carouselabs.com.",
    }
  }
  if (kind) {
    const needed = featuresFor(kind)
    if (!needed.some((f) => access.features[f].enabled)) {
      // Paused for everyone: the admin's message, not "not on your account".
      const paused = needed.find((f) => access.features[f].paused)
      if (paused && needed.every((f) => access.features[f].paused || access.features[f].override === "off")) {
        return { status: 403, code: "feature_paused", error: access.features[paused].pauseMessage ?? "" }
      }
      return {
        status: 403,
        code: "feature_disabled",
        error: `${FEATURE_LABELS[needed[0]]} ${needed.length > 1 ? "and replies aren't" : "isn't"} available on your account.`,
      }
    }
  }
  return null
}

// The per-feature day and month limits that apply to a usage kind. Rewrites
// and Tests have none of their own (they count toward the daily cap).
export function featureLimitsFor(
  access: EngageAccess,
  kind: EngageUsageKind,
): { day: Limit; month: Limit } {
  if (kind === "rewrites" || kind === "tests" || kind === "x_rewrites" || kind === "x_tests") {
    return { day: "unlimited", month: "unlimited" }
  }
  return {
    day: access.limits[`${kind}.day`].effective,
    month: access.limits[`${kind}.month`].effective,
  }
}
