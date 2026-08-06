// DELETE /api/admin/interns/[id]/leave/[leaveId] — admin revokes a leave
// request: deletes the InternLeaveRequest and its matching InternAttendance
// row together (same internId + date), atomically, restoring the intern's
// balance.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; leaveId: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id, leaveId } = await params

  const leaveRequest = await db.internLeaveRequest.findUnique({ where: { id: leaveId } })
  if (!leaveRequest || leaveRequest.internId !== id) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  }

  const intern = await db.intern.findUnique({ where: { id } })

  await db.$transaction([
    db.internLeaveRequest.delete({ where: { id: leaveId } }),
    db.internAttendance.deleteMany({
      where: { internId: id, date: leaveRequest.date, status: "leave", markedBy: "self" },
    }),
  ])

  await logAdminAction({
    adminEmail: admin.email,
    action: "REVOKE_INTERN_LEAVE",
    targetEmail: intern?.email,
    details: `Revoked leave for ${leaveRequest.date.toISOString().slice(0, 10)}${leaveRequest.reason ? ` (reason: "${leaveRequest.reason}")` : ""}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
