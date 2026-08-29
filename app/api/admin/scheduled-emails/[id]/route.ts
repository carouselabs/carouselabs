// PATCH  /api/admin/scheduled-emails/[id] — reschedule a still-queued email
//        to a new time.
// DELETE /api/admin/scheduled-emails/[id] — cancel a still-queued email
//        (hard delete — a canceled send has no history worth keeping).
// Both are rejected once the row has left "queued" (sending/sent/failed) —
// there's nothing left to cancel or reschedule at that point.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let scheduledFor: Date
  try {
    const body = await req.json()
    const parsed = new Date(body.scheduledFor)
    if (Number.isNaN(parsed.getTime())) throw new Error()
    scheduledFor = parsed
  } catch {
    return NextResponse.json({ error: "Expected { scheduledFor: ISO datetime }" }, { status: 400 })
  }
  if (scheduledFor.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 })
  }

  const existing = await db.scheduledEmail.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.status !== "queued") {
    return NextResponse.json({ error: `Can't reschedule — already ${existing.status}` }, { status: 400 })
  }

  const updated = await db.scheduledEmail.update({ where: { id }, data: { scheduledFor } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "RESCHEDULE_EMAIL",
    details: `"${existing.subject}" moved to ${scheduledFor.toISOString()}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, scheduledEmail: updated })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  const existing = await db.scheduledEmail.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.status !== "queued") {
    return NextResponse.json({ error: `Can't cancel — already ${existing.status}` }, { status: 400 })
  }

  await db.scheduledEmail.delete({ where: { id } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "CANCEL_SCHEDULED_EMAIL",
    details: `Canceled "${existing.subject}" (was scheduled for ${existing.scheduledFor.toISOString()})`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
