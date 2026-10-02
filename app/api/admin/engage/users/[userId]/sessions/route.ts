// POST /api/admin/engage/users/[userId]/sessions — sign this user's
// extension out of one browser, or all of them. They can sign in again
// (pause their access instead to stop that).
// body: { tokenId?: string, reason }   (no tokenId = every browser)
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const body = z.object({
  tokenId: z.string().min(1).max(64).optional(),
  reason: z.string().trim().min(3, "Say why").max(500),
})

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.suspend")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const { tokenId, reason } = parsed.data

  const { count } = await db.extensionToken.updateMany({
    where: { userId, revokedAt: null, ...(tokenId ? { id: tokenId } : {}) },
    data: { revokedAt: new Date() },
  })
  if (tokenId && count === 0) {
    return NextResponse.json({ error: "That browser is already signed out" }, { status: 404 })
  }

  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_REVOKE_SESSIONS",
    product: "engage",
    targetUserId: userId,
    targetEmail: user.email,
    details: tokenId ? "Signed the extension out of one browser" : `Signed the extension out of ${count} browser(s)`,
    newValue: { tokenId: tokenId ?? null, revoked: count },
    reason,
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true, revoked: count })
}
