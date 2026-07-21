// POST /api/admin/credits/reset-pro — reset every PRO user to 0/1000 and
// every GROWTH user to 0/2000. Destructive; the UI double-confirms before
// calling.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { PRO_MONTHLY_CREDITS, GROWTH_MONTHLY_CREDITS } from "@/lib/lemonsqueezy"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const [pro, growth] = await Promise.all([
    db.subscription.updateMany({
      where: { plan: "PRO" },
      data: { creditsUsed: 0, creditsTotal: PRO_MONTHLY_CREDITS },
    }),
    db.subscription.updateMany({
      where: { plan: "GROWTH" },
      data: { creditsUsed: 0, creditsTotal: GROWTH_MONTHLY_CREDITS },
    }),
  ])
  const updated = pro.count + growth.count

  await logAdminAction({
    adminEmail: admin.email,
    action: "RESET_ALL_PRO_CREDITS",
    details: `Reset ${pro.count} Pro subscriptions to 0/${PRO_MONTHLY_CREDITS} and ${growth.count} Growth subscriptions to 0/${GROWTH_MONTHLY_CREDITS}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, updated })
}
