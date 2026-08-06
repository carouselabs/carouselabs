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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ATTENDANCE_STATUSES = ["present", "absent", "half-day", "leave"]

function dayBounds(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`)
  const end = new Date(`${date}T23:59:59.999Z`)
  return { start, end }
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

  // Atomic — either the whole day's checklist (points entries + attendance)
  // saves, or none of it does.
  await db.$transaction([
    ...creates.map((data) => db.internPointEntry.create({ data })),
    ...(attendance
      ? [
          db.internAttendance.upsert({
            where: { internId_date: { internId: id, date: entryDate } },
            create: {
              internId: id,
              date: entryDate,
              status: attendance.status,
              note: attendance.note?.trim() || null,
              markedBy: admin.email,
            },
            update: {
              status: attendance.status,
              note: attendance.note?.trim() || null,
              markedBy: admin.email,
            },
          }),
        ]
      : []),
  ])

  const totalPoints = creates.reduce((sum, e) => sum + e.points, 0)

  await logAdminAction({
    adminEmail: admin.email,
    action: "ADD_DAILY_CHECKLIST",
    targetEmail: intern.email,
    details: `Daily checklist for ${date}: ${creates.length} entries, ${totalPoints >= 0 ? "+" : ""}${totalPoints} pts${attendance ? `, attendance: ${attendance.status}` : ""}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, count: creates.length, totalPoints })
}
