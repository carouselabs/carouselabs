// GET /api/admin/referrals — every referrer (any user with at least one
// successful referral), with the totals the admin dashboard's list needs.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const referrers = await db.user.findMany({
    where: { referralsMade: { some: {} } },
    include: {
      profile: { select: { name: true } },
      referralsMade: { select: { id: true } },
      commissions: { select: { status: true, amount: true } },
    },
  })

  const rows = referrers
    .map((u) => {
      const pendingCommission = u.commissions
        .filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + c.amount, 0)
      const totalPaid = u.commissions
        .filter((c) => c.status === "paid")
        .reduce((sum, c) => sum + c.amount, 0)
      return {
        id: u.id,
        name: u.profile?.name ?? null,
        email: u.email,
        totalReferrals: u.referralsMade.length,
        pendingCommission,
        totalPaid,
      }
    })
    .sort((a, b) => b.pendingCommission - a.pendingCommission)

  return NextResponse.json({ referrers: rows })
}
