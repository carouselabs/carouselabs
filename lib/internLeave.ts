import { db } from "@/lib/db"
import { getLeaveBalance } from "@/lib/internPoints"

/** All decisions and writes use one serializable snapshot. Only rolled-back
 * serialization conflicts are retried; no external effects happen here. */
export async function requestInternLeave(internId: string, clerkId: string, date: Date, reason: string | null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const intern = await tx.intern.findUnique({ where: { id: internId, clerkId } })
        if (!intern || !intern.active || intern.status === "completed" || intern.status === "terminated") {
          return { ok: false as const, error: "Your internship is not active", httpStatus: 403 }
        }
        const key = { internId_date: { internId, date } }
        const existingAttendance = await tx.internAttendance.findUnique({ where: key })
        const existingLeave = await tx.internLeaveRequest.findUnique({ where: key })
        if (existingAttendance || existingLeave) return duplicateDate()

        const approved = await tx.internLeaveRequest.count({ where: { internId, status: "approved" } })
        if (getLeaveBalance(intern, approved).remaining <= 0) {
          const attendance = await tx.internAttendance.create({ data: {
            internId, date, status: "absent", markedBy: "self",
            note: "Leave requested but balance exhausted — auto-marked absent",
          } })
          return { ok: true as const, status: "absent", message: "Marked as Absent — no leave days remaining", attendance }
        }
        const leaveRequest = await tx.internLeaveRequest.create({
          data: { internId, date, reason, status: "approved" },
        })
        const attendance = await tx.internAttendance.create({
          data: { internId, date, status: "leave", note: reason, markedBy: "self" },
        })
        return { ok: true as const, status: "leave", message: "Leave approved", leaveRequest, attendance }
      }, { isolationLevel: "Serializable" })
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? err.code : null
      if (code === "P2002") return duplicateDate()
      if (code === "P2034" && attempt < 2) continue
      // An ambiguous database error is never retried automatically. The UI
      // may refresh the day's existing record before a user decides to retry.
      console.error("[intern/leave] transaction failed", { conflict: code === "P2034" })
      return { ok: false as const, error: "Could not save leave. Refresh your leave history before trying again.", httpStatus: 503 }
    }
  }
  throw new Error("Unreachable leave retry state")
}

function duplicateDate() {
  return { ok: false as const, error: "This date already has an attendance or leave record", httpStatus: 400 }
}
