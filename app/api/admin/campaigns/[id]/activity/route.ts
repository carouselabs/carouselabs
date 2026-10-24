// GET /api/admin/campaigns/[id]/activity — the campaign's first 48 hours
// after sending (how many people had seen and clicked it by each hour), the
// links its people clicked, and where they read it (lib/emailReport.ts).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { campaignActivity } from "@/lib/emailReport"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return NextResponse.json(await campaignActivity((await params).id))
}
