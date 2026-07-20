// POST /api/admin/users/[userId]/plan — switch a user FREE ↔ PRO.
// body: { plan: "FREE" | "PRO" }
// Upgrading to PRO starts a fresh monthly allowance (creditsUsed 0/1000) so a
// comped user isn't blocked by their FREE-era lifetime-post counter.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { MONTHLY_CREDITS } from "@/lib/credits"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  let plan: "FREE" | "PRO"
  try {
    const body = await req.json()
    plan = body.plan
    if (plan !== "FREE" && plan !== "PRO") throw new Error()
  } catch {
    return NextResponse.json({ error: "Expected { plan: FREE|PRO }" }, { status: 400 })
  }

  const sub = await db.subscription.findUnique({ where: { userId }, include: { user: true } })
  if (!sub) return NextResponse.json({ error: "User has no subscription row" }, { status: 404 })

  const updated = await db.subscription.update({
    where: { userId },
    data:
      plan === "PRO"
        ? { plan, status: "ACTIVE", creditsUsed: 0, creditsTotal: MONTHLY_CREDITS }
        : { plan, creditsUsed: 0 },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "CHANGE_PLAN",
    targetUserId: userId,
    targetEmail: sub.user.email,
    details: `Changed plan from ${sub.plan} to ${plan}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, plan: updated.plan })
}
