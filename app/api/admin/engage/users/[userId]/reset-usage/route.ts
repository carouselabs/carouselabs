// POST /api/admin/engage/users/[userId]/reset-usage — start this user's
// counts over.
// body: { scope: "today" | "month" | "free", reason }
//   today  today's per-feature counts and the rolling 24-hour cap
//   month  this month's per-feature counts
//   free   the free generations used (gives them all back)
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { resetUsage } from "@/lib/engage/usage"
import { resetExtDailyLimit } from "@/lib/extDailyLimit"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const body = z.object({
  scope: z.enum(["today", "month", "free"]),
  reason: z.string().trim().min(3, "Say why").max(500),
})

const LABELS = { today: "today's usage", month: "this month's usage", free: "free generations used" }

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const { scope, reason } = parsed.data

  let oldValue: number | null = null
  if (scope === "today") {
    await Promise.all([resetUsage(userId, ["day"]), resetExtDailyLimit(userId)])
  } else if (scope === "month") {
    await resetUsage(userId, ["month"])
  } else {
    const before = await db.user.findUnique({ where: { id: userId }, select: { extensionTrialUsed: true } })
    oldValue = before?.extensionTrialUsed ?? null
    await db.user.update({ where: { id: userId }, data: { extensionTrialUsed: 0 } })
  }

  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_RESET_USAGE",
    product: "engage",
    targetUserId: userId,
    targetEmail: user.email,
    details: `Reset ${LABELS[scope]}`,
    oldValue: scope === "free" ? { freeUsed: oldValue } : { scope },
    newValue: scope === "free" ? { freeUsed: 0 } : { scope, count: 0 },
    reason,
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true })
}
