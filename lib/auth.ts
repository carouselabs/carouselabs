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
