// GET    /api/admin/interns/[id] — intern detail + full entry history.
// PATCH  /api/admin/interns/[id] — update active status.
// DELETE /api/admin/interns/[id] — permanently delete the intern and all
// their data (entries, attendance, leave requests, notes, extensions all
// cascade via the schema's onDelete: Cascade). Irreversible.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import {
  summarizeEntries,
  predefinedTaskNames,
  getLeaveBalance,
  calculateEndDate,
  getInternshipProgress,
  getAttendanceFlag,
  getConsecutiveAbsences,
} from "@/lib/internPoints"
import { mergeDailyRecords } from "@/lib/groupEntries"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const intern = await db.intern.findUnique({
    where: { id },
    include: {
      entries: { orderBy: { date: "desc" } },
      attendance: { orderBy: { date: "desc" } },
      leaveRequests: { orderBy: { date: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      extensions: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const { total, pointsToday, pointsThisWeek } = summarizeEntries(intern.entries)
  const taskNames = await predefinedTaskNames()
  const approvedLeaveCount = intern.leaveRequests.filter((r) => r.status === "approved").length
  const leaveBalance = getLeaveBalance(intern, approvedLeaveCount)
  const endDate = intern.endDate ?? calculateEndDate(intern.joinDate, intern.durationMonths)
  const progress = getInternshipProgress(intern.joinDate, endDate)
  const presentDays = intern.attendance.filter((a) => a.status === "present").length
  const absentDays = intern.attendance.filter((a) => a.status === "absent").length
  const halfDays = intern.attendance.filter((a) => a.status === "half-day").length
  const attendanceFlag = getAttendanceFlag(presentDays, absentDays, halfDays)
  const consecutiveAbsences = getConsecutiveAbsences(intern.attendance)

  const entries = intern.entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    points: e.points,
    category: e.category,
    note: e.note,
    source: e.source,
    addedBy: e.addedBy,
    isPredefinedTask: taskNames.has(e.category),
  }))

  const attendance = intern.attendance.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    status: a.status,
    note: a.note,
    markedBy: a.markedBy,
  }))

  const leaveRequests = intern.leaveRequests.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    reason: r.reason,
    status: r.status,
    requestedAt: r.requestedAt.toISOString(),
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
  }))

  const notes = intern.notes.map((n) => ({
    id: n.id,
    content: n.content,
    type: n.type,
    addedBy: n.addedBy,
    createdAt: n.createdAt.toISOString(),
  }))

  const extensions = intern.extensions.map((x) => ({
    id: x.id,
    addedMonths: x.addedMonths,
    reason: x.reason,
    previousEndDate: x.previousEndDate.toISOString(),
    newEndDate: x.newEndDate.toISOString(),
    extendedBy: x.extendedBy,
    createdAt: x.createdAt.toISOString(),
  }))

  return NextResponse.json({
    intern: {
      id: intern.id,
      name: intern.name,
      email: intern.email,
      phone: intern.phone,
      role: intern.role,
      department: intern.department,
      photoUrl: intern.photoUrl,
      status: intern.status,
      active: intern.active,
      joinDate: intern.joinDate.toISOString(),
      durationMonths: intern.durationMonths,
      endDate: endDate.toISOString(),
      createdAt: intern.createdAt,
      totalPoints: total,
      pointsToday,
      pointsThisWeek,
      leaveBalance,
      progress,
      attendanceFlag,
      consecutiveAbsences,
    },
    entries,
    attendance,
    leaveRequests,
    notes,
    extensions,
    // Entries + attendance merged by calendar day — lets the admin Daily
    // Log view (and any future consumer) render per-day rows, including
    // attendance-only days (e.g. "absent" with no points logged), without
    // recomputing this client-side.
    groupedByDate: mergeDailyRecords(entries, attendance),
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  let active: boolean
  try {
    const body = await req.json()
    if (typeof body.active !== "boolean") throw new Error()
    active = body.active
  } catch {
    return NextResponse.json({ error: "Expected { active: boolean }" }, { status: 400 })
  }

  try {
    const updated = await db.intern.update({ where: { id }, data: { active } })
    await logAdminAction({
      adminEmail: admin.email,
      action: "UPDATE_INTERN",
      targetEmail: updated.email,
      details: active ? "Marked active" : "Marked inactive",
      ipAddress: getRequestIp(req),
    })
    return NextResponse.json({ ok: true, active: updated.active })
  } catch {
    return NextResponse.json({ error: "Intern not found" }, { status: 404 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  await db.intern.delete({ where: { id } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "DELETE_INTERN",
    targetEmail: intern.email,
    details: `Intern permanently deleted: ${intern.name} <${intern.email}> — all entries, attendance, leave requests, notes, and extension history removed`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
