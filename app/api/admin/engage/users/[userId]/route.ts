// GET /api/admin/engage/users/[userId] — the user page's data
// (lib/engage/userDetail.ts).
import { NextResponse } from "next/server"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { engageUserDetail } from "@/lib/engage/userDetail"
import { notFound } from "@/lib/engage/adminApi"

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const detail = await engageUserDetail(userId)
  if (!detail) return notFound()
  return NextResponse.json(detail)
}
