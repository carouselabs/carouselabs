// POST /api/admin/credits/reset-pro — reset every PRO user to 0/1000.
// Destructive; the UI double-confirms before calling.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { MONTHLY_CREDITS } from "@/lib/credits"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const res = await db.subscription.updateMany({
    where: { plan: "PRO" },
    data: { creditsUsed: 0, creditsTotal: MONTHLY_CREDITS },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "RESET_ALL_PRO_CREDITS",
    details: `Reset ${res.count} Pro subscriptions to 0 / ${MONTHLY_CREDITS}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, updated: res.count })
}
