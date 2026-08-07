// GET  /api/admin/interns — all interns with computed point totals, shaped
// for the admin interns table.
// POST /api/admin/interns — create a new intern (clerkId linked later on
// first matching sign-in).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import {
  summarizeEntries,
  getLeaveBalance,
  calculateEndDate,
  getInternshipProgress,
  getAttendanceFlag,
  getConsecutiveAbsences,
} from "@/lib/internPoints"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { sendInternWelcomeEmail } from "@/lib/email"
import { APP_URL } from "@/emails/EmailLayout"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const interns = await db.intern.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      entries: { select: { points: true, date: true } },
      leaveRequests: { where: { status: "approved" }, select: { id: true } },
      attendance: { select: { date: true, status: true }, orderBy: { date: "desc" } },
    },
  })

  // Ranked by all-time total points, descending — this list doubles as the
  // admin leaderboard.
  const rows = interns
    .map((i) => {
      const { total, pointsToday, pointsThisWeek } = summarizeEntries(i.entries)
      const lastEntryDate = i.entries.reduce<Date | null>(
        (max, e) => (!max || e.date > max ? e.date : max),
        null,
      )
      const leave = getLeaveBalance(i, i.leaveRequests.length)
      const endDate = i.endDate ?? calculateEndDate(i.joinDate, i.durationMonths)
      const progress = getInternshipProgress(i.joinDate, endDate)
      const presentDays = i.attendance.filter((a) => a.status === "present").length
      const absentDays = i.attendance.filter((a) => a.status === "absent").length
      const halfDays = i.attendance.filter((a) => a.status === "half-day").length
      const attendanceFlag = getAttendanceFlag(presentDays, absentDays, halfDays)
      const consecutiveAbsences = getConsecutiveAbsences(i.attendance)
      return {
        id: i.id,
        name: i.name,
        email: i.email,
        role: i.role,
        status: i.status,
        active: i.active,
        createdAt: i.createdAt,
        totalPoints: total,
        pointsToday,
        pointsThisWeek,
        lastEntryDate,
        leaveUsed: leave.used,
        leaveAllowance: leave.total,
        progress,
        attendanceFlag,
        consecutiveAbsences,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)

  return NextResponse.json({ interns: rows })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let name: string
  let email: string
  let phone: string | null
  let role: string | null
  let department: string | null
  let photoUrl: string | null
  let joinDate: Date
  let durationMonths: number
  try {
    const body = await req.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new Error()
    if (typeof body.email !== "string" || !body.email.trim()) throw new Error()
    name = body.name.trim()
    email = body.email.trim().toLowerCase()
    phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
    role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : null
    department = typeof body.department === "string" && body.department.trim() ? body.department.trim() : null
    photoUrl = typeof body.photoUrl === "string" && body.photoUrl.trim() ? body.photoUrl.trim() : null

    joinDate = body.joinDate ? new Date(body.joinDate) : new Date()
    if (isNaN(joinDate.getTime())) throw new Error()

    durationMonths = body.durationMonths !== undefined ? Number(body.durationMonths) : 3
    if (!Number.isInteger(durationMonths) || durationMonths < 1) throw new Error()
  } catch {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 })
  }
  const endDate = calculateEndDate(joinDate, durationMonths)

  try {
    const intern = await db.intern.create({
      data: { name, email, phone, role, department, photoUrl, joinDate, durationMonths, endDate },
    })
    await logAdminAction({
      adminEmail: admin.email,
      action: "CREATE_INTERN",
      targetEmail: email,
      details: `Intern created: ${name} <${email}>`,
      ipAddress: getRequestIp(req),
    })

    // Best-effort — a Resend hiccup should never fail intern creation.
    try {
      const joinDateLabel = joinDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      await sendInternWelcomeEmail(email, name, role, joinDateLabel, intern.leaveAllowance, `${APP_URL}/sign-in`)
    } catch (err) {
      console.error("[api/admin/interns] welcome email failed:", err)
    }

    return NextResponse.json({ intern })
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "An intern with this email already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create intern" }, { status: 500 })
  }
}
