import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null

  const existing = await db.user.findUnique({
    where: { clerkId: userId },
    include: { profile: true, subscription: true },
  })
  if (existing) {
    // Backfill: users created via the old bootstrap path (before this fix)
    // may have no Subscription row. Create one with schema defaults on access.
    if (!existing.subscription) {
      await db.subscription.create({ data: { userId: existing.id } })
      return db.user.findUnique({
        where: { clerkId: userId },
        include: { profile: true, subscription: true },
      })
    }
    return existing
  }

  // No DB row yet — webhook hasn't fired (common in local dev).
  // Bootstrap the user record from Clerk's session data.
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    ""

  // The email may already belong to a User row under a different clerkId
  // (Clerk account deleted and re-created, or a new sign-in method). Creating
  // would violate the unique email constraint (P2002) — re-link that row to
  // the new clerkId instead, then re-run so the normal path (including the
  // subscription backfill) picks it up.
  if (email) {
    const existingByEmail = await db.user.findUnique({ where: { email } })
    if (existingByEmail && existingByEmail.clerkId !== userId) {
      await db.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId: userId },
      })
      return getCurrentUser()
    }
  }

  return db.user.upsert({
    where: { clerkId: userId },
    create: {
      clerkId: userId,
      email,
      subscription: { create: {} },
      usage: { create: {} },
    },
    update: {},
    include: { profile: true, subscription: true },
  })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return user
}
