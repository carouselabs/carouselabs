// POST /api/admin/engage/users/[userId]/suspend — pause or resume this
// user's Engage access. Engage only: their website account and billing are
// untouched (the account-wide suspension lives on the main Users page).
// body: { suspend: boolean, reason }
// The same action as bulk pause / resume (lib/engage/userActions.ts).
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { setEngageSuspended } from "@/lib/engage/userActions"
import { getRequestIp } from "@/lib/auditLog"

const body = z.object({ suspend: z.boolean(), reason: z.string().trim().min(3, "Say why").max(500) })

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.suspend")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()
  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const { suspend, reason } = parsed.data

  const result = await setEngageSuspended({ admin: gate.admin, user, suspend, reason, ip: getRequestIp(req) })
  if (!result.ok) return NextResponse.json({ error: result.why }, { status: 400 })
  return NextResponse.json({ ok: true, suspended: suspend })
}
