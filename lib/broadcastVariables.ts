// lib/broadcastVariables.ts
// Server-only half of the dynamic-variables feature — resolves
// AVAILABLE_VARIABLES (see lib/broadcastRender.ts, which owns the pure
// catalog + substitution so client components can import it directly
// without pulling this file's `db` import into the browser bundle).
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"
import { ensureReferralCode, getSiteOrigin } from "@/lib/referral"
import { AVAILABLE_VARIABLES, applyVariables, type VariableValues } from "@/lib/broadcastRender"

// Re-exported so server-side callers (admin routes, cron) only need one
// import for the whole feature, same convention as lib/referral.ts.
export { AVAILABLE_VARIABLES, applyVariables }

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Resolves every AVAILABLE_VARIABLES key for one user. Throws if the user
// doesn't exist — callers (send routes, cron) already have a confirmed User
// row before reaching this, so a throw here means something is genuinely
// wrong, not an expected "skip this recipient" case.
export async function resolveVariables(userId: string): Promise<VariableValues> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true, subscription: true },
  })
  if (!user) throw new Error(`resolveVariables: no user ${userId}`)

  const plan = user.subscription?.plan ?? "FREE"
  const referralCode = await ensureReferralCode(user.id)
  const siteOrigin = await getSiteOrigin()

  const creditsRemaining = user.subscription
    ? availableCredits({
        plan,
        creditsUsed: user.subscription.creditsUsed,
        creditsTotal: user.subscription.creditsTotal,
        extraCredits: user.subscription.extraCredits,
        extraCreditsExpiry: user.subscription.extraCreditsExpiry,
      })
    : 0

  const daysSinceSignup = Math.floor((Date.now() - user.createdAt.getTime()) / MS_PER_DAY)

  // Profile.name is a free-form full name; first token is a reasonable
  // "first name" without needing a dedicated field. Falls back to the email
  // local-part, then a generic greeting, so the variable is never blank.
  const rawName = user.profile?.name?.trim() || user.email.split("@")[0] || "there"
  const firstName = rawName.split(/\s+/)[0]

  return {
    firstName,
    email: user.email,
    plan,
    referralCode,
    referralLink: `${siteOrigin}/?ref=${referralCode}`,
    creditsRemaining: String(creditsRemaining),
    daysSinceSignup: String(daysSinceSignup),
  }
}
