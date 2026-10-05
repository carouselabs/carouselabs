import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/lib/db"

// An invitation can be claimed once by its verified email owner. After that,
// the stable Clerk identity owns it even if either account changes email.
// Callers must first authenticate an active application user.
export async function getOwnedInternId(user: { clerkId: string }): Promise<string | null> {
  const linked = await db.intern.findUnique({ where: { clerkId: user.clerkId }, select: { id: true } })
  if (linked) return linked.id

  const identity = await currentUser()
  const primary = identity?.primaryEmailAddress
  if (identity?.id !== user.clerkId || !primary || primary.verification?.status !== "verified") return null

  const invitation = await db.intern.findFirst({
    where: { clerkId: null, email: { equals: primary.emailAddress, mode: "insensitive" } },
    select: { id: true },
  })
  if (!invitation) return null
  try {
    const claimed = await db.intern.updateMany({
      where: { id: invitation.id, clerkId: null, email: { equals: primary.emailAddress, mode: "insensitive" } },
      data: { clerkId: user.clerkId },
    })
    if (claimed.count === 1) return invitation.id
  } catch (err) {
    if (!(err && typeof err === "object" && "code" in err && err.code === "P2002")) throw err
  }
  // A parallel first visit may have won. Never overwrite its identity.
  const winner = await db.intern.findUnique({ where: { clerkId: user.clerkId }, select: { id: true } })
  return winner?.id === invitation.id ? winner.id : null
}
