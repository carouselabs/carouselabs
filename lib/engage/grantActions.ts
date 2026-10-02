// lib/engage/grantActions.ts — giving, extending and revoking free Engage
// access, shared by the user page and "Add user" (by email). Each writes the
// audit trail with what changed and why.
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import { sendEngageAccessGrantedEmail } from "@/lib/email"
import { EXTENSION_STORE_URL } from "@/lib/plans"
import { grantEndsAt, GRANT_DURATION_LABELS, type GrantDuration } from "@/lib/engage/grants"
import type { EngageAdmin } from "@/lib/engage/adminAccess"

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "lifetime"

export async function createGrant(input: {
  admin: EngageAdmin
  email: string
  duration: GrantDuration
  customEndsAt?: string
  reason: string
  sendInvite: boolean
  ip?: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const email = input.email.trim().toLowerCase()
  const endsAt = grantEndsAt(input.duration, now, input.customEndsAt)
  if (endsAt && endsAt.getTime() <= now.getTime()) throw new Error("The end date must be in the future")

  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })
  const grant = await db.engageAccessGrant.create({
    data: { userId: user?.id ?? null, email, startsAt: now, endsAt, reason: input.reason, grantedBy: input.admin.email },
  })

  await logAdminAction({
    adminEmail: input.admin.email,
    action: "ENGAGE_GRANT_ACCESS",
    product: "engage",
    targetUserId: user?.id,
    targetEmail: email,
    details: `Granted Engage access (${GRANT_DURATION_LABELS[input.duration]}, until ${fmt(endsAt)})${user ? "" : " — waiting for sign-up"}`,
    newValue: { grantId: grant.id, endsAt: endsAt?.toISOString() ?? null, duration: input.duration },
    reason: input.reason,
    ipAddress: input.ip,
  })

  let inviteSent: boolean | null = null
  if (input.sendInvite) {
    inviteSent = await sendEngageAccessGrantedEmail(email, endsAt ? fmt(endsAt) : null, EXTENSION_STORE_URL)
      .then(() => true)
      .catch((err) => {
        console.error("[engage] invitation email failed:", err)
        return false
      })
  }

  return { grant, pending: !user, inviteSent }
}

export async function revokeGrant(input: { admin: EngageAdmin; grantId: string; reason: string; ip?: string }) {
  const grant = await db.engageAccessGrant.findUnique({ where: { id: input.grantId } })
  if (!grant) return { error: "Grant not found" as const }
  if (grant.revokedAt) return { error: "This grant is already revoked" as const }
  const previousEnd = grant.endsAt

  const updated = await db.engageAccessGrant.update({
    where: { id: grant.id },
    data: { revokedAt: new Date(), revokedBy: input.admin.email, revokeReason: input.reason },
  })
  await logAdminAction({
    adminEmail: input.admin.email,
    action: "ENGAGE_REVOKE_ACCESS",
    product: "engage",
    targetUserId: grant.userId ?? undefined,
    targetEmail: grant.email,
    details: `Revoked Engage access (was until ${fmt(previousEnd)})`,
    oldValue: { grantId: grant.id, endsAt: previousEnd?.toISOString() ?? null },
    newValue: { grantId: grant.id, revokedAt: updated.revokedAt?.toISOString() },
    reason: input.reason,
    ipAddress: input.ip,
  })
  return { grant: updated }
}

// Extends from the grant's current end (or from now, if it already ended):
// "+30 days" on a grant ending next week adds 30 days to next week.
export async function extendGrant(input: {
  admin: EngageAdmin
  grantId: string
  duration: GrantDuration
  customEndsAt?: string
  reason: string
  ip?: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  const grant = await db.engageAccessGrant.findUnique({ where: { id: input.grantId } })
  if (!grant) return { error: "Grant not found" as const }
  if (grant.revokedAt) return { error: "A revoked grant can't be extended; give a new one" as const }
  if (grant.endsAt === null) return { error: "This grant is already lifetime" as const }

  const previousEnd = grant.endsAt
  const from = previousEnd.getTime() > now.getTime() ? previousEnd : now
  const endsAt = grantEndsAt(input.duration, from, input.customEndsAt)
  if (endsAt && endsAt.getTime() <= now.getTime()) return { error: "The new end date must be in the future" as const }

  const updated = await db.engageAccessGrant.update({ where: { id: grant.id }, data: { endsAt } })
  await logAdminAction({
    adminEmail: input.admin.email,
    action: "ENGAGE_EXTEND_ACCESS",
    product: "engage",
    targetUserId: grant.userId ?? undefined,
    targetEmail: grant.email,
    details: `Extended Engage access from ${fmt(previousEnd)} to ${fmt(endsAt)}`,
    oldValue: { grantId: grant.id, endsAt: previousEnd.toISOString() },
    newValue: { grantId: grant.id, endsAt: endsAt?.toISOString() ?? null },
    reason: input.reason,
    ipAddress: input.ip,
  })
  return { grant: updated }
}
