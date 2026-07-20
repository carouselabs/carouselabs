// GET /api/admin/stats — overview numbers for the admin dashboard.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { getOverviewStats } from "@/lib/adminStats"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const stats = await getOverviewStats()
  return NextResponse.json(stats)
}
