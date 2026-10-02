// lib/engage/access.ts — loads what's stored about a user and returns their
// effective Engage access (lib/engage/accessRules.ts). Used by the generation
// gate, /api/ext/me and the admin pages, so all three always agree.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { COMMENT_CREDITS_ENFORCED } from "@/lib/commentCredits"
import { computeEngageAccess, type EngageAccess } from "@/lib/engage/accessRules"

export async function loadEngageAccess(userId: string, now: Date = new Date()): Promise<EngageAccess | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      suspendedAt: true,
      deletedAt: true,
      extensionTrialUsed: true,
      engageControl: true,
      extensionSubscription: { select: { status: true, endsAt: true } },
    },
  })
  if (!user) return null

  const email = user.email.trim().toLowerCase()
  const grants = await db.engageAccessGrant.findMany({
    where: { OR: [{ userId }, { userId: null, email }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // A grant made before this person signed up is matched by email; link it
  // to the account now so it shows on their page and follows the account.
  if (grants.some((g) => g.userId === null)) {
    db.engageAccessGrant
      .updateMany({ where: { userId: null, email }, data: { userId } })
      .catch((err) => console.error("[engage] linking pending grants failed:", err))
  }

  return computeEngageAccess({
    now,
    paywallEnforced: COMMENT_CREDITS_ENFORCED,
    accountSuspendedAt: user.suspendedAt ?? user.deletedAt,
    control: user.engageControl,
    subscription: user.extensionSubscription,
    grants,
    freeUsed: user.extensionTrialUsed,
  })
}

// True when the Engage admin tables don't exist yet: the code is deployed but
// scripts/engage-admin-schema.sql hasn't been run. The gate then falls back to
// the plan rules alone rather than taking the extension down for everyone.
export function isEngageSchemaMissing(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")
  )
}
