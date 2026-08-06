// PATCH /api/admin/interns/[id]/status — body { status, reason? }. Sets
// status and keeps the legacy `active` boolean in sync (only "active" and
// "extended" count as active) — offboarding ("completed"/"terminated") also
// blocks new self-service leave applications (see /api/intern/leave).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const VALID_STATUSES = ["active", "completed", "terminated", "extended"]

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let status: string
  let reason: string | null
  try {
    const body = await req.json()
    if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status)) throw new Error()
    status = body.status
    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null
    if (status === "terminated" && !reason) throw new Error()
  } catch {
    return NextResponse.json(
      { error: "status is required (a reason is required when terminating)" },
      { status: 400 },
    )
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const active = status === "active" || status === "extended"
  const updated = await db.intern.update({ where: { id }, data: { status, active } })

  if (reason) {
    await db.internNote.create({
      data: {
        internId: id,
        content: reason,
        type: status === "terminated" ? "warning" : "general",
        addedBy: admin.email,
      },
    })
  }

  await logAdminAction({
    adminEmail: admin.email,
    action: "UPDATE_INTERN_STATUS",
    targetEmail: intern.email,
    details: `Status changed to ${status}${reason ? ` (reason: "${reason}")` : ""}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, intern: updated })
}
