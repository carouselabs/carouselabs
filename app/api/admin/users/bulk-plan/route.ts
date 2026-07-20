// POST /api/admin/users/bulk-plan — change plan for multiple users at once.
// body: { userIds: string[], plan: "FREE" | "PRO" }
// Same per-user effect as the single-user plan route: upgrading to PRO
// starts a fresh monthly allowance; downgrading to FREE resets creditsUsed.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { MONTHLY_CREDITS } from "@/lib/credits"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let userIds: string[]
  let plan: "FREE" | "PRO"
  try {
    const body = await req.json()
    userIds = body.userIds
    plan = body.plan
    if (
      !Array.isArray(userIds) ||
      userIds.length === 0 ||
      userIds.length > 500 ||
      userIds.some((id) => typeof id !== "string") ||
      (plan !== "FREE" && plan !== "PRO")
    ) {
      throw new Error()
    }
  } catch {
    return NextResponse.json(
      { error: "Expected { userIds: string[], plan: FREE|PRO }" },
      { status: 400 },
    )
  }

  const res = await db.subscription.updateMany({
    where: { userId: { in: userIds } },
    data:
      plan === "PRO"
        ? { plan, status: "ACTIVE", creditsUsed: 0, creditsTotal: MONTHLY_CREDITS }
        : { plan, creditsUsed: 0 },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "BULK_CHANGE_PLAN",
    details: `Changed ${res.count} users to ${plan} (${userIds.length} requested)`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, updated: res.count })
}
