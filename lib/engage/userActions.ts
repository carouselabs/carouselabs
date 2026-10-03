// lib/engage/userActions.ts — pausing / resuming a user's Engage access
// (shared by the user page and bulk actions on the users table, so both do
// exactly the same thing and write the same audit trail) and tagging for bulk
// actions (the same audit entry as the user page's tags route). Each returns
// why it did nothing instead of throwing.
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/auditLog"
import type { EngageAdmin } from "@/lib/engage/adminAccess"

type Target = { id: string; email: string }
export type ActionResult = { ok: true } | { ok: false; why: string }

export async function setEngageSuspended(input: {
  admin: EngageAdmin
  user: Target
  suspend: boolean
  reason: string
  ip?: string
  // Bulk actions say so in the audit details.
  bulk?: boolean
}): Promise<ActionResult> {
  const { admin, user, suspend, reason } = input
  if (suspend && user.id === admin.id) return { ok: false, why: "You can't pause your own access" }

  const current = await db.engageUserControl.findUnique({ where: { userId: user.id }, select: { suspendedAt: true } })
  if (!!current?.suspendedAt === suspend) return { ok: false, why: suspend ? "Already paused" : "Not paused" }

  const data = suspend
    ? { suspendedAt: new Date(), suspendedBy: admin.email, suspendReason: reason }
    : { suspendedAt: null, suspendedBy: null, suspendReason: null }
  await db.engageUserControl.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data, updatedBy: admin.email },
    update: { ...data, updatedBy: admin.email },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: suspend ? "ENGAGE_SUSPEND" : "ENGAGE_REACTIVATE",
    product: "engage",
    targetUserId: user.id,
    targetEmail: user.email,
    details: `${suspend ? "Paused Engage access" : "Resumed Engage access"}${input.bulk ? " (bulk)" : ""}`,
    oldValue: { suspended: !suspend },
    newValue: { suspended: suspend },
    reason,
    ipAddress: input.ip,
  })
  return { ok: true }
}

export async function addUserTag(input: { admin: EngageAdmin; user: Target; tag: string; ip?: string; bulk?: boolean }): Promise<ActionResult> {
  const { admin, user, tag } = input
  // One statement, so a tag added twice at once is added (and audited) once.
  const { count } = await db.adminUserTag.createMany({ data: [{ userId: user.id, tag, createdBy: admin.email }], skipDuplicates: true })
  if (count === 0) return { ok: false, why: "Already tagged" }
  await logAdminAction({
    adminEmail: admin.email,
    action: "ENGAGE_ADD_TAG",
    product: "engage",
    targetUserId: user.id,
    targetEmail: user.email,
    details: `Tagged "${tag}"${input.bulk ? " (bulk)" : ""}`,
    newValue: { tag },
    ipAddress: input.ip,
  })
  return { ok: true }
}
