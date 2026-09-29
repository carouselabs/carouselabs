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
        clerkId: userId,
        deletedAt: existing.deletedAt,
        suspendedAt: existing.suspendedAt,
      })
      return null
    }
    // Backfill: users created via the old bootstrap path (before this fix)
    // may have no Subscription row. Create one with schema defaults on access.
    if (!existing.subscription) {
      await db.subscription.upsert({ where: { userId: existing.id }, create: { userId: existing.id }, update: {} })
      return db.user.findUnique({
        where: { clerkId: userId },
        include: { profile: true, subscription: true },
      })
    }
    return existing
  }

  // No DB row yet — webhook hasn't fired (common in local dev).
  // Bootstrap the user record from Clerk's session data.
  console.log("[getCurrentUser] DIAGNOSTIC: no existing row for clerkId, bootstrapping", { clerkId: userId })
  const clerkUser = await currentUser()
  if (!clerkUser || clerkUser.id !== userId) {
    console.log("[getCurrentUser] DIAGNOSTIC: currentUser() mismatch/null", {
      clerkId: userId,
      clerkUserId: clerkUser?.id ?? null,
    })
    return null
  }

  const primary = clerkUser.primaryEmailAddress
  if (!primary || primary.verification?.status !== "verified") {
    console.log("[getCurrentUser] DIAGNOSTIC: primary email missing/unverified", {
      clerkId: userId,
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
      console.log("[getCurrentUser] DIAGNOSTIC: email belongs to a different clerkId", {
        thisClerkId: userId,
        email,
        existingRowClerkId: existingByEmail.clerkId,
      })
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
  })

  // Reaching here means no User row existed for this clerkId (nor for this
  // email, checked above) before this call — a genuinely new signup. Apply
  // any admin pre-filled profile (see /admin/prefill-user) instead of
  // sending them through onboarding. Best-effort — worst case they just see
  // the normal onboarding flow.
  if (email) {
    try {
      await applyPendingPrefill(created.id, email)
    } catch (err) {
      console.error("[auth] pending prefill apply failed:", err)
    }
  }

  return db.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true, subscription: true },
  })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return user
}
