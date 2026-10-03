// lib/auditLog.ts
// Immutable record of every mutating admin action. Fire-and-forget from
// route handlers — logging failure must never block or roll back the action
// it's describing, so callers just `await` it after the mutation succeeds.
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"

export type AdminAuditAction =
  | "GRANT_CREDITS"
  | "SET_CREDITS"
  | "RESET_CREDITS"
  | "BULK_GRANT_CREDITS"
  | "RESET_ALL_PRO_CREDITS"
  | "CHANGE_PLAN"
  | "BULK_CHANGE_PLAN"
  | "SUSPEND_USER"
  | "UNSUSPEND_USER"
  | "BULK_SUSPEND_USER"
  | "UPDATE_NOTE"
  | "UPDATE_SETTINGS"
  | "SEND_BROADCAST"
  | "CREATE_INTERN"
  | "UPDATE_INTERN"
  | "DELETE_INTERN"
  | "ADD_INTERN_ENTRY"
  | "UPDATE_INTERN_ENTRY"
  | "DELETE_INTERN_ENTRY"
  | "ADD_DAILY_CHECKLIST"
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "MARK_ATTENDANCE"
  | "REVOKE_INTERN_LEAVE"
  | "EXTEND_INTERNSHIP"
  | "REDUCE_INTERNSHIP"
  | "UPLOAD_CERTIFICATE"
  | "DELETE_CERTIFICATE"
  | "UPDATE_INTERN_STATUS"
  | "ADD_INTERN_NOTE"
  | "DELETE_INTERN_NOTE"
  | "BROADCAST_INTERN_EMAIL"
  | "REPLY_INTERN_MESSAGE"
  | "SCHEDULE_EMAIL"
  | "RESCHEDULE_EMAIL"
  | "CANCEL_SCHEDULED_EMAIL"
  | "REFERRAL_PAYOUT_RECORDED"
  | "CREATE_EMAIL_SEQUENCE"
  | "UPDATE_EMAIL_SEQUENCE"
  | "DELETE_EMAIL_SEQUENCE"
  // ── Engage admin (product: "engage") ──
  | "ENGAGE_GRANT_ACCESS"
  | "ENGAGE_EXTEND_ACCESS"
  | "ENGAGE_REVOKE_ACCESS"
  | "ENGAGE_UPDATE_FEATURES"
  | "ENGAGE_UPDATE_LIMITS"
  | "ENGAGE_SET_FREE_GENERATIONS"
  | "ENGAGE_RESET_USAGE"
  | "ENGAGE_SUSPEND"
  | "ENGAGE_REACTIVATE"
  | "ENGAGE_REVOKE_SESSIONS"
  | "ENGAGE_ADD_NOTE"
  | "ENGAGE_DELETE_NOTE"
  | "ENGAGE_ADD_TAG"
  | "ENGAGE_REMOVE_TAG"
  // Settings for everyone (admin → Engage → Controls)
  | "ENGAGE_PAUSE_FEATURE"
  | "ENGAGE_RESUME_FEATURE"
  | "ENGAGE_SET_INSERT"
  | "ENGAGE_SET_MIN_VERSION"
  // AI (admin → Engage → AI)
  | "ENGAGE_SET_AI_MODEL"
  | "ENGAGE_SET_AI_PRICE"
  // A CSV download of Engage data (who, what, how many rows)
  | "ENGAGE_EXPORT"

// Rows are only ever created: there is no route that edits or deletes them.
export async function logAdminAction({
  adminEmail,
  action,
  targetUserId,
  targetEmail,
  details,
  ipAddress,
  product,
  oldValue,
  newValue,
  reason,
}: {
  adminEmail: string
  action: AdminAuditAction
  targetUserId?: string
  targetEmail?: string
  details: string
  ipAddress?: string
  // Structured detail (Engage admin): what it was, what it became, and why.
  product?: "engage"
  oldValue?: Prisma.InputJsonValue | null
  newValue?: Prisma.InputJsonValue | null
  reason?: string | null
}) {
  await db.auditLog.create({
    data: {
      adminEmail,
      action,
      targetUserId,
      targetEmail,
      details,
      ipAddress,
      product,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
      reason: reason ?? undefined,
    },
    select: { id: true },
  })
}

// Best-effort client IP for the audit trail — proxies/CDNs set these; not
// authoritative, just a breadcrumb.
export function getRequestIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]?.trim()
  return req.headers.get("x-real-ip") ?? undefined
}
