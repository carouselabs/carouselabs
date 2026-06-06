import { auth } from '@clerk/nextjs/server'
import { db } from './db'

export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  return db.user.findUnique({
    where: { clerkUserId },
    include: { profile: true, subscription: true },
  })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
