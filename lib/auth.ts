import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { applyPendingPrefill } from "@/lib/profile/pendingPrefill"

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  const existing = await db.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true, subscription: true },
  })
  if (existing) {
    if (existing.deletedAt || existing.suspendedAt) {
      console.log("[getCurrentUser] DIAGNOSTIC: existing row is deleted/suspended", {
        deleted: !!existing.deletedAt,
        suspended: !!existing.suspendedAt,
      })
      return null
    }
    // Backfill: users created via the old bootstrap path (before this fix)
    // may have no Subscription row. Create one with schema defaults on access.
    if (!existing.subscription) {
      await db.subscription.upsert({ where: { userId: existing.id }, create: { userId: existing.id }, update: {} })
      const refreshed = await db.user.findUnique({
        where: { clerkId: userId },
        include: { profile: true, subscription: true },
      })
      return refreshed && !refreshed.deletedAt && !refreshed.suspendedAt ? refreshed : null
    }
    return existing
  }

  // No DB row yet — webhook hasn't fired (common in local dev).
  // Bootstrap the user record from Clerk's session data.
  console.log("[getCurrentUser] DIAGNOSTIC: no existing row for clerkId, bootstrapping")
  const clerkUser = await currentUser()
  if (!clerkUser || clerkUser.id !== userId) {
    console.log("[getCurrentUser] DIAGNOSTIC: currentUser() mismatch/null", {
      hasClerkUser: !!clerkUser,
    })
    return null
  }

  const primary = clerkUser.primaryEmailAddress
  if (!primary || primary.verification?.status !== "verified") {
    console.log("[getCurrentUser] DIAGNOSTIC: primary email missing/unverified", {
      hasPrimary: !!primary,
      verificationStatus: primary?.verification?.status ?? null,
    })
    return null
  }
  const email = primary.emailAddress

  // Email ownership is not permission to assume an existing application's
  // identity. Account recovery must explicitly verify the original account.
  if (email) {
    const existingByEmail = await db.user.findUnique({ where: { email } })
    if (existingByEmail && existingByEmail.clerkId !== userId) {
      console.log("[getCurrentUser] DIAGNOSTIC: email belongs to a different clerkId")
      return null
    }
  }

  const created = await db.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email,
      subscription: { create: {} },
      usage: { create: {} },
    },
    update: {},
  }).catch(async (err: unknown) => {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      // Nested creates can race a webhook or another initial request. Read the
      // winner only by the authenticated Clerk ID, never by email.
      return db.user.findUnique({ where: { clerkId: userId } })
    }
    throw err
  })
  if (!created || created.deletedAt || created.suspendedAt) return null

  // Reaching here means no User row existed for this clerkId (nor for this
  // email, checked above) before this call — a genuinely new signup. Apply
  // any admin pre-filled profile (see /admin/prefill-user) instead of
  // sending them through onboarding. Best-effort — worst case they just see
  // the normal onboarding flow.
  if (email) {
    try {
      await applyPendingPrefill(created.id, email)
    } catch {
      console.error("[auth] pending prefill apply failed:")
    }
  }

  const refreshed = await db.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true, subscription: true },
  })
  return refreshed && !refreshed.deletedAt && !refreshed.suspendedAt ? refreshed : null
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return user
}
