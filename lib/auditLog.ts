// lib/auditLog.ts
// Immutable record of every mutating admin action. Fire-and-forget from
// route handlers — logging failure must never block or roll back the action
// it's describing, so callers just `await` it after the mutation succeeds.
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

export async function logAdminAction({
  adminEmail,
  action,
  targetUserId,
  targetEmail,
  details,
  ipAddress,
}: {
  adminEmail: string
  action: AdminAuditAction
  targetUserId?: string
  targetEmail?: string
  details: string
  ipAddress?: string
}) {
  await db.auditLog.create({
    data: { adminEmail, action, targetUserId, targetEmail, details, ipAddress },
  })
}

// Best-effort client IP for the audit trail — proxies/CDNs set these; not
// authoritative, just a breadcrumb.
export function getRequestIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]?.trim()
  return req.headers.get("x-real-ip") ?? undefined
}
