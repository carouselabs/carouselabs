// POST /api/admin/users/bulk-suspend — suspend/unsuspend multiple users.
// body: { userIds: string[], suspend: boolean }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let userIds: string[]
  let suspend: boolean
  try {
    const body = await req.json()
    userIds = body.userIds
    suspend = body.suspend
    if (
      !Array.isArray(userIds) ||
      userIds.length === 0 ||
      userIds.length > 500 ||
      userIds.some((id) => typeof id !== "string") ||
      typeof suspend !== "boolean"
    ) {
      throw new Error()
    }
  } catch {
    return NextResponse.json(
      { error: "Expected { userIds: string[], suspend: boolean }" },
      { status: 400 },
    )
  }

  // Don't let the admin suspend themself via a bulk selection.
  const targetIds = suspend ? userIds.filter((id) => id !== admin.id) : userIds

  const res = await db.user.updateMany({
    where: { id: { in: targetIds } },
    data: { suspendedAt: suspend ? new Date() : null },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "BULK_SUSPEND_USER",
    details: `${suspend ? "Suspended" : "Unsuspended"} ${res.count} users (${userIds.length} requested)`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, updated: res.count, skippedSelf: suspend && targetIds.length !== userIds.length })
}
