// DELETE /api/admin/engage/sessions/[tokenId] — sign one browser's extension
// out, from the Sessions page. The same as on the user's page: they can sign
// in again (pause their access to stop that). body: { reason }
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { parseBody } from "@/lib/engage/adminApi"
import { tokenPlatform, PLATFORM_LABELS } from "@/lib/engage/features"
import { getRequestIp, logAdminAction } from "@/lib/auditLog"

const body = z.object({ reason: z.string().trim().min(3, "Say why").max(500) })

export async function DELETE(req: Request, { params }: { params: Promise<{ tokenId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.suspend")
  if (!gate.ok) return gate.response
  const { tokenId } = await params
  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response

  const token = await db.extensionToken.findUnique({
    where: { id: tokenId },
    select: { id: true, userId: true, device: true, user: { select: { email: true } } },
  })
  if (!token) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  // Only a browser still signed in: two admins clicking at once sign it out
  // (and audit it) once.
  const { count } = await db.extensionToken.updateMany({ where: { id: token.id, revokedAt: null }, data: { revokedAt: new Date() } })
  if (count === 0) return NextResponse.json({ error: "That browser is already signed out" }, { status: 400 })
  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_REVOKE_SESSIONS",
    product: "engage",
    targetUserId: token.userId,
    targetEmail: token.user.email,
    details: `Signed the ${PLATFORM_LABELS[tokenPlatform(token.device)]} extension out of one browser (${token.device ?? "browser"})`,
    newValue: { tokenId: token.id, revoked: 1 },
    reason: parsed.data.reason,
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true })
}
