// lib/profile/pendingPrefill.ts
// Consumes a PendingProfilePrefill (see app/api/admin/prefill-user) into a
// real Profile the moment a matching User is created — called from both
// places a User row can come into existence: the Clerk webhook's
// `user.created` handler and lib/auth.ts's getCurrentUser bootstrap fallback.
// Both call sites only reach this for a User that did NOT already exist, so
// it's safe to unconditionally mark the new Profile onboardingDone.
import { db } from "@/lib/db"

export async function applyPendingPrefill(userId: string, email: string): Promise<void> {
  const pending = await db.pendingProfilePrefill.findUnique({ where: { email } })
  if (!pending) return

  const columns = {
    headline: pending.headline,
    industry: pending.industry,
    targetAudience: pending.targetAudience,
    contentPillars: pending.contentPillars,
    writingStyle: pending.writingStyle,
  }

  await db.profile.upsert({
    where: { userId },
    create: { userId, ...columns, onboardingDone: true, prefilledByAdmin: true },
    update: { ...columns, onboardingDone: true, prefilledByAdmin: true },
  })

  // Best-effort: the prefill has been applied either way, and a leftover
  // pending row just means it'd be re-applied verbatim if this ever ran
  // again (e.g. a retried webhook) — not a duplicate or a conflict.
  try {
    await db.pendingProfilePrefill.delete({ where: { email } })
  } catch (err) {
    console.error("[pendingPrefill] cleanup failed:", err)
  }
}
