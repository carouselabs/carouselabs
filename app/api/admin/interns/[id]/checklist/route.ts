// GET  /api/admin/interns/[id]/checklist?date=YYYY-MM-DD — how many point
// entries already exist for that day (so the form can warn before
// double-logging), plus the day's attendance record if one exists.
// POST /api/admin/interns/[id]/checklist — save a full day's checklist
// (checked predefined tasks + ad-hoc custom entries, plus an optional
// attendance status) as one atomic batch.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { sendInternDailySummaryEmail, sendInternAbsentWarningEmail } from "@/lib/email"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ATTENDANCE_STATUSES = ["present", "absent", "half-day", "leave"]

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(`${date}T23:59:59.999Z`)
  return { start, end }
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

// Emails are best-effort — never fail the checklist save because Resend hiccuped.
async function safeEmail(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.error("[admin/interns/checklist] email failed:", err)
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const date = new URL(req.url).searchParams.get("date")
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 })
  }

  const { start, end } = dayBounds(date)
  const [entries, attendance] = await Promise.all([
    db.internPointEntry.findMany({
      where: { internId: id, date: { gte: start, lte: end } },
      select: { points: true },
    }),
    db.internAttendance.findUnique({
      where: { internId_date: { internId: id, date: new Date(`${date}T00:00:00.000Z`) } },
    }),
  ])

  return NextResponse.json({
    count: entries.length,
    totalPoints: entries.reduce((sum, e) => sum + e.points, 0),
    attendance,
  })
}

type TaskEntryInput = { taskId: string; quantity: number }
type CustomEntryInput = { name: string; points: number; note?: string }
type AttendanceInput = { status: string; note?: string } | null

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let date: string
  let taskEntries: TaskEntryInput[]
  let customEntries: CustomEntryInput[]
  let attendance: AttendanceInput
  try {
    const body = await req.json()

    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) throw new Error()
    date = body.date

    taskEntries = Array.isArray(body.taskEntries) ? body.taskEntries : []
    for (const t of taskEntries) {
      if (typeof t.taskId !== "string" || !t.taskId) throw new Error()
      if (typeof t.quantity !== "number" || !Number.isInteger(t.quantity) || t.quantity < 1) throw new Error()
    }

    customEntries = Array.isArray(body.customEntries) ? body.customEntries : []
    for (const c of customEntries) {
      if (typeof c.name !== "string" || !c.name.trim()) throw new Error()
      if (typeof c.points !== "number" || !Number.isInteger(c.points)) throw new Error()
      if (c.note !== undefined && typeof c.note !== "string") throw new Error()
    }

    if (body.attendance === null || body.attendance === undefined) {
      attendance = null
    } else {
      const a = body.attendance
      if (typeof a.status !== "string" || !ATTENDANCE_STATUSES.includes(a.status)) throw new Error()
      if (a.note !== undefined && typeof a.note !== "string") throw new Error()
      attendance = { status: a.status, note: a.note }
    }
  } catch {
    return NextResponse.json({ error: "Invalid checklist payload" }, { status: 400 })
  }

  if (taskEntries.length === 0 && customEntries.length === 0 && !attendance) {
    return NextResponse.json(
      { error: "Check at least one task, add a custom entry, or set attendance" },
      { status: 400 },
    )
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const taskIds = [...new Set(taskEntries.map((t) => t.taskId))]
  const tasks = await db.predefinedTask.findMany({ where: { id: { in: taskIds } } })
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  if (taskById.size !== taskIds.length) {
    return NextResponse.json({ error: "One or more selected tasks no longer exist" }, { status: 400 })
  }

  const entryDate = new Date(`${date}T00:00:00.000Z`)

  // ── Daily email dedupe ────────────────────────────────────────────
  // Resolve the day's attendance status from this submission, falling back to
  // whatever was already on record (e.g. tasks added in a later edit, after
  // attendance was already set earlier the same day). Only the FIRST
  // submission for a given (intern, day) that resolves a status sends an
  // email — re-submits/edits afterward are silently skipped.
  const existingAttendance = await db.internAttendance.findUnique({
    where: { internId_date: { internId: id, date: entryDate } },
  })
  const resolvedStatus = attendance?.status ?? existingAttendance?.status ?? null
  const shouldSendEmail = resolvedStatus !== null && !existingAttendance?.dailyEmailSentAt

  const creates = [
    ...taskEntries.map((t) => {
      const task = taskById.get(t.taskId)!
      return {
        internId: id,
        date: entryDate,
        points: task.points * t.quantity,
        category: task.name,
        note: t.quantity > 1 ? `×${t.quantity}` : null,
        source: "manual",
        addedBy: admin.email,
      }
    }),
    ...customEntries.map((c) => ({
      internId: id,
      date: entryDate,
      points: c.points,
      category: c.name.trim(),
      note: c.note?.trim() || null,
      source: "manual",
      addedBy: admin.email,
    })),
  ]

  // Attendance write for this transaction — either the normal upsert (when
  // this request sets/changes attendance), or, if attendance already existed
  // from an earlier submission today and just hasn't triggered an email yet,
  // a plain update that only stamps dailyEmailSentAt. Otherwise no write.
  const attendanceWrite = attendance
    ? db.internAttendance.upsert({
        where: { internId_date: { internId: id, date: entryDate } },
        create: {
          internId: id,
          date: entryDate,
          status: attendance.status,
          note: attendance.note?.trim() || null,
          markedBy: admin.email,
          dailyEmailSentAt: shouldSendEmail ? new Date() : null,
        },
        update: {
          status: attendance.status,
          note: attendance.note?.trim() || null,
          markedBy: admin.email,
          ...(shouldSendEmail ? { dailyEmailSentAt: new Date() } : {}),
        },
      })
    : shouldSendEmail && existingAttendance
      ? db.internAttendance.update({
          where: { internId_date: { internId: id, date: entryDate } },
          data: { dailyEmailSentAt: new Date() },
        })
      : null

  // Atomic — either the whole day's checklist (points entries + attendance)
  // saves, or none of it does.
  await db.$transaction([
    ...creates.map((data) => db.internPointEntry.create({ data })),
    ...(attendanceWrite ? [attendanceWrite] : []),
  ])

  const totalPoints = creates.reduce((sum, e) => sum + e.points, 0)

  await logAdminAction({
    adminEmail: admin.email,
    action: "ADD_DAILY_CHECKLIST",
    targetEmail: intern.email,
    details: `Daily checklist for ${date}: ${creates.length} entries, ${totalPoints >= 0 ? "+" : ""}${totalPoints} pts${attendance ? `, attendance: ${attendance.status}` : ""}`,
    ipAddress: getRequestIp(req),
  })

  // ── Daily email notification (best-effort, never fails the save) ───
  if (shouldSendEmail && resolvedStatus) {
    const dateLabel = formatDateLabel(date)

    if (resolvedStatus === "present" || resolvedStatus === "half-day") {
      // Full day's tasks, not just this request's — a later edit that adds
      // more tasks (without re-touching attendance) never reaches here again
      // since shouldSendEmail is already false by then, but a same-request
      // combination of "first-ever attendance + tasks" must reflect everything
      // logged for the day so far.
      const { start, end } = dayBounds(date)
      const dayEntries = await db.internPointEntry.findMany({
        where: { internId: id, date: { gte: start, lte: end } },
        select: { category: true, points: true },
      })
      const allTime = await db.internPointEntry.aggregate({
        where: { internId: id },
        _sum: { points: true },
      })
      const pointsToday = dayEntries.reduce((sum, e) => sum + e.points, 0)

      await safeEmail(() =>
        sendInternDailySummaryEmail(
          intern.email,
          intern.name,
          dateLabel,
          dayEntries.map((e) => ({ name: e.category, points: e.points })),
          pointsToday,
          allTime._sum.points ?? 0,
        ),
      )
    } else if (resolvedStatus === "absent") {
      // Guard: an approved self-service leave for this exact day means this
      // isn't a genuine unplanned absence, even if the status field says
      // "absent" — skip the warning.
      const approvedLeave = await db.internLeaveRequest.findUnique({
        where: { internId_date: { internId: id, date: entryDate } },
      })

      if (!approvedLeave || approvedLeave.status !== "approved") {
        const allAttendance = await db.internAttendance.findMany({
          where: { internId: id },
          select: { status: true },
        })
        const presentDays = allAttendance.filter((a) => a.status === "present").length
        const absentDays = allAttendance.filter((a) => a.status === "absent").length
        const halfDays = allAttendance.filter((a) => a.status === "half-day").length
        const totalDays = presentDays + absentDays + halfDays
        const attendanceRate =
          totalDays > 0 ? Math.round(((presentDays + halfDays * 0.5) / totalDays) * 100) : 100

        await safeEmail(() =>
          sendInternAbsentWarningEmail(
            intern.email,
            intern.name,
            dateLabel,
            presentDays,
            absentDays,
            attendanceRate,
          ),
        )
      }
    }
    // resolvedStatus === "leave" → skip entirely, per spec (self-approved
    // leave isn't something to warn or celebrate).
  }

  return NextResponse.json({ ok: true, count: creates.length, totalPoints })
}
