// /admin/interns/[id] — intern's full profile: overview, daily log, leave &
// attendance, notes, and a printable performance report.
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
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
import { InternDetail } from "@/components/admin/InternDetail"

export const dynamic = "force-dynamic"

export default async function AdminInternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const intern = await db.intern.findUnique({
    where: { id },
    include: {
      entries: { orderBy: { date: "desc" } },
      attendance: { orderBy: { date: "desc" } },
      leaveRequests: { orderBy: { date: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      extensions: { orderBy: { createdAt: "desc" } },
      certificates: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!intern) notFound()

  // Rank on the all-time-points leaderboard — same ranking the roster and
  // intern portal leaderboard use, computed here so the profile doesn't need
  // a second client-side fetch of every intern's entries.
  const allInterns = await db.intern.findMany({
    where: { active: true },
    select: { id: true, entries: { select: { points: true } } },
  })
  const ranked = allInterns
    .map((i) => ({ id: i.id, total: i.entries.reduce((sum, e) => sum + e.points, 0) }))
    .sort((a, b) => b.total - a.total)
  const rank = ranked.findIndex((r) => r.id === id) + 1

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

  return (
    <div className="space-y-6">
      <Link
        href="/admin/interns"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8A8A8A] hover:text-white transition-colors print:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All interns
      </Link>

      <InternDetail
        intern={{
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
          totalPoints: total,
          pointsToday,
          pointsThisWeek,
          leaveBalance,
          progress,
          rank: rank > 0 ? rank : null,
          attendanceFlag,
          consecutiveAbsences,
        }}
        entries={intern.entries.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          points: e.points,
          category: e.category,
          note: e.note,
          source: e.source,
          addedBy: e.addedBy,
          isPredefinedTask: taskNames.has(e.category),
        }))}
        attendance={intern.attendance.map((a) => ({
          id: a.id,
          date: a.date.toISOString(),
          status: a.status,
          note: a.note,
          markedBy: a.markedBy,
        }))}
        leaveRequests={intern.leaveRequests.map((r) => ({
          id: r.id,
          date: r.date.toISOString(),
          reason: r.reason,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
          reviewedBy: r.reviewedBy,
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        }))}
        notes={intern.notes.map((n) => ({
          id: n.id,
          content: n.content,
          type: n.type,
          addedBy: n.addedBy,
          createdAt: n.createdAt.toISOString(),
        }))}
        extensions={intern.extensions.map((x) => ({
          id: x.id,
          addedDays: x.addedDays,
          reason: x.reason,
          previousEndDate: x.previousEndDate.toISOString(),
          newEndDate: x.newEndDate.toISOString(),
          extendedBy: x.extendedBy,
          createdAt: x.createdAt.toISOString(),
        }))}
        certificates={intern.certificates.map((c) => ({
          id: c.id,
          verificationCode: c.verificationCode,
          certificateUrl: c.certificateUrl,
          issuedFor: c.issuedFor,
          issuedDate: c.issuedDate.toISOString(),
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
