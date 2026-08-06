// GET  /api/intern/leave — the logged-in intern's own leave requests +
// balance.
// POST /api/intern/leave — self-service leave application. Auto-approved:
// creates an InternLeaveRequest (status "approved") and a matching
// InternAttendance (status "leave", markedBy "self") together, atomically.
// Visibility for admins comes from those two records showing up in the
// admin Leave Requests panel and Daily Log — not a separate audit-log entry,
// since this isn't an admin action.
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getLeaveBalance } from "@/lib/internPoints"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const intern = await db.intern.findUnique({
    where: { email: user.email },
    include: { leaveRequests: { orderBy: { date: "desc" } } },
  })
  if (!intern) return NextResponse.json({ intern: null })

  const approvedCount = intern.leaveRequests.filter((r) => r.status === "approved").length
  const balance = getLeaveBalance(intern, approvedCount)

  return NextResponse.json({ leaveRequests: intern.leaveRequests, balance })
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const intern = await db.intern.findUnique({
    where: { email: user.email },
    include: { leaveRequests: { where: { status: "approved" }, select: { id: true } } },
  })
  if (!intern) return NextResponse.json({ error: "You don't have intern access" }, { status: 403 })
  if (!intern.active || intern.status === "completed" || intern.status === "terminated") {
    return NextResponse.json(
      { error: "Your internship has ended — you can no longer apply for leave" },
      { status: 403 },
    )
  }

  let date: string
  let reason: string | null
  try {
    const body = await req.json()
    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) throw new Error()
    date = body.date
    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null
  } catch {
    return NextResponse.json({ error: "date (YYYY-MM-DD) is required" }, { status: 400 })
  }

  const requestedDate = new Date(`${date}T00:00:00.000Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  if (requestedDate < today) {
    return NextResponse.json({ error: "Cannot apply for leave on a past date" }, { status: 400 })
  }

  const balance = getLeaveBalance(intern, intern.leaveRequests.length)
  if (balance.remaining <= 0) {
    return NextResponse.json({ error: "No leave days remaining" }, { status: 400 })
  }

  const [existingAttendance, existingLeave] = await Promise.all([
    db.internAttendance.findUnique({
      where: { internId_date: { internId: intern.id, date: requestedDate } },
    }),
    db.internLeaveRequest.findUnique({
      where: { internId_date: { internId: intern.id, date: requestedDate } },
    }),
  ])
  if (existingAttendance || existingLeave) {
    return NextResponse.json({ error: "This date already has an attendance or leave record" }, { status: 400 })
  }

  try {
    const [leaveRequest, attendance] = await db.$transaction([
      db.internLeaveRequest.create({
        data: { internId: intern.id, date: requestedDate, reason, status: "approved" },
      }),
      db.internAttendance.create({
        data: { internId: intern.id, date: requestedDate, status: "leave", note: reason, markedBy: "self" },
      }),
    ])
    return NextResponse.json({ ok: true, leaveRequest, attendance })
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: "This date already has an attendance or leave record" },
        { status: 400 },
      )
    }
    throw e
  }
}
