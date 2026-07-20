// POST /api/admin/credits/reset-pro — reset every PRO user to 0/1000.
// Destructive; the UI double-confirms before calling.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { MONTHLY_CREDITS } from "@/lib/credits"

export async function POST() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const res = await db.subscription.updateMany({
    where: { plan: "PRO" },
    data: { creditsUsed: 0, creditsTotal: MONTHLY_CREDITS },
  })
  return NextResponse.json({ ok: true, updated: res.count })
}
