// GET  /api/intern/leave — the logged-in intern's own leave requests +
// balance.
// POST /api/intern/leave — self-service leave application. Auto-approved
// when balance remains: creates an InternLeaveRequest (status "approved")
// and a matching InternAttendance (status "leave", markedBy "self") together,
// atomically. Once the balance is exhausted, the request is no longer
// rejected — it's auto-marked absent instead (InternAttendance only, no
// InternLeaveRequest, since there's no balance left to consume).
// Visibility for admins comes from those records showing up in the admin
// Leave Requests panel and Daily Log — not a separate audit-log entry, since
// this isn't an admin action.
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedInternId } from "@/lib/internAuth"
import { getLeaveBalance } from "@/lib/internPoints"
import { requestInternLeave } from "@/lib/internLeave"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const internId = await getOwnedInternId(user)
  const intern = internId ? await db.intern.findUnique({
    where: { id: internId },
    include: { leaveRequests: { orderBy: { date: "desc" } } },
  }) : null
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
  const internId = await getOwnedInternId(user)
  if (!internId) return NextResponse.json({ error: "You don't have intern access" }, { status: 403 })

  let date: string
  let reason: string | null
  try {
    const body = await req.json()
    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) throw new Error()
    date = body.date
    if (body.reason != null && (typeof body.reason !== "string" || body.reason.length > 2000)) throw new Error()
    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null
  } catch {
    return NextResponse.json({ error: "A valid date (YYYY-MM-DD) and a reason of at most 2000 characters are required" }, { status: 400 })
  }

  const requestedDate = new Date(date + "T00:00:00.000Z")
  if (!Number.isFinite(requestedDate.getTime()) || requestedDate.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  if (requestedDate < today) {
    return NextResponse.json({ error: "Cannot apply for leave on a past date" }, { status: 400 })
  }

  const result = await requestInternLeave(internId, user.clerkId, requestedDate, reason)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.httpStatus })
  return NextResponse.json(result)
}
