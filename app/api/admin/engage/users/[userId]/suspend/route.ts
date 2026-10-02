// POST /api/admin/engage/users/[userId]/suspend — pause or resume this
// user's Engage access. Engage only: their website account and billing are
// untouched (the account-wide suspension lives on the main Users page).
// body: { suspend: boolean, reason }
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const body = z.object({ suspend: z.boolean(), reason: z.string().trim().min(3, "Say why").max(500) })

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.suspend")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()
  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const { suspend, reason } = parsed.data
  if (suspend && userId === gate.admin.id) {
    return NextResponse.json({ error: "You can't pause your own access" }, { status: 400 })
  }

  const current = await db.engageUserControl.findUnique({ where: { userId }, select: { suspendedAt: true } })
  if (!!current?.suspendedAt === suspend) {
    return NextResponse.json({ error: suspend ? "Already paused" : "Not paused" }, { status: 400 })
  }

  const data = suspend
    ? { suspendedAt: new Date(), suspendedBy: gate.admin.email, suspendReason: reason }
    : { suspendedAt: null, suspendedBy: null, suspendReason: null }
  await db.engageUserControl.upsert({
    where: { userId },
    create: { userId, ...data, updatedBy: gate.admin.email },
    update: { ...data, updatedBy: gate.admin.email },
  })

  await logAdminAction({
    adminEmail: gate.admin.email,
    action: suspend ? "ENGAGE_SUSPEND" : "ENGAGE_REACTIVATE",
    product: "engage",
    targetUserId: userId,
    targetEmail: user.email,
    details: suspend ? "Paused Engage access" : "Resumed Engage access",
    oldValue: { suspended: !suspend },
    newValue: { suspended: suspend },
    reason,
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true, suspended: suspend })
}
