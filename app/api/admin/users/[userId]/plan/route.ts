// POST /api/admin/users/[userId]/plan — switch a user between FREE/PRO/GROWTH.
// body: { plan: "FREE" | "PRO" | "GROWTH" }
// Upgrading to a paid plan starts a fresh monthly allowance (creditsUsed 0,
// creditsTotal per-plan) so a comped user isn't blocked by their FREE-era
// lifetime-post counter.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { creditsForPlan } from "@/lib/lemonsqueezy"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  let plan: "FREE" | "PRO" | "GROWTH"
  try {
    const body = await req.json()
    plan = body.plan
    if (plan !== "FREE" && plan !== "PRO" && plan !== "GROWTH") throw new Error()
  } catch {
    return NextResponse.json({ error: "Expected { plan: FREE|PRO|GROWTH }" }, { status: 400 })
  }

  const sub = await db.subscription.findUnique({ where: { userId }, include: { user: true } })
  if (!sub) return NextResponse.json({ error: "User has no subscription row" }, { status: 404 })

  const updated = await db.subscription.update({
    where: { userId },
    data:
      plan === "FREE"
        ? { plan, creditsUsed: 0 }
        : { plan, status: "ACTIVE", creditsUsed: 0, creditsTotal: creditsForPlan(plan) },
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
