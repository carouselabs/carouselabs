// /intern — read-only performance portal for interns. Matches the logged-in
// user's email to an Intern record; links clerkId permanently on first visit
// so future matches don't depend on email staying in sync.
import { ShieldOff } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedInternId } from "@/lib/internAuth"
import { db } from "@/lib/db"
import { EmptyState } from "@/components/patterns/EmptyState"
import {
  summarizeEntries,
  predefinedTaskNames,
  getLeaveBalance,
  calculateEndDate,
  getInternshipProgress,
} from "@/lib/internPoints"
import type { DayCell, AttendanceStatus } from "@/components/intern/PerformanceCalendar"
import { InternPortalView } from "@/components/intern/InternPortalView"

export const dynamic = "force-dynamic"

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildMonthGrid(
  pointsByDay: Map<string, number>,
  tasksByDay: Map<string, string[]>,
  attendanceByDay: Map<string, AttendanceStatus>,
) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: DayCell[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, points: null, tasks: [], attendanceStatus: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(new Date(year, month, d))
    cells.push({
      day: d,
      points: pointsByDay.has(key) ? pointsByDay.get(key)! : null,
      tasks: tasksByDay.get(key) ?? [],
      attendanceStatus: attendanceByDay.get(key) ?? null,
    })
  }

  return { cells, monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
}

export default async function InternPage() {
  const user = await getCurrentUser()
  if (!user) return null // AppLayout already redirects unauthenticated visitors

  const internId = await getOwnedInternId(user)
  const intern = internId ? await db.intern.findUnique({
    where: { id: internId },
    include: {
      entries: { orderBy: { date: "desc" } },
      attendance: { orderBy: { date: "desc" } },
      leaveRequests: { orderBy: { date: "desc" } },
      extensions: { orderBy: { createdAt: "desc" } },
    },
  }) : null

  if (!intern) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center">
        <EmptyState
          icon={<ShieldOff />}
          title="You don't have intern access"
          description="This page is only available to interns tracked on the CarouseLabs points board."
        />
      </div>
    )
  }

  const { total, pointsToday, pointsThisWeek } = summarizeEntries(intern.entries)
  const taskNames = await predefinedTaskNames()

  const approvedLeaveCount = intern.leaveRequests.filter((r) => r.status === "approved").length
  const leaveBalance = getLeaveBalance(intern, approvedLeaveCount)
  const endDate = intern.endDate ?? calculateEndDate(intern.joinDate, intern.durationMonths)
  const progress = getInternshipProgress(intern.joinDate, endDate)
  const hasEnded = intern.status === "completed" || intern.status === "terminated"

  const pointsByDay = new Map<string, number>()
  const tasksByDay = new Map<string, string[]>()
  for (const e of intern.entries) {
    const key = dayKey(e.date)
    pointsByDay.set(key, (pointsByDay.get(key) ?? 0) + e.points)
    const tasks = tasksByDay.get(key) ?? []
    if (!tasks.includes(e.category)) tasks.push(e.category)
    tasksByDay.set(key, tasks)
  }
  const attendanceByDay = new Map<string, AttendanceStatus>()
  for (const a of intern.attendance) {
    attendanceByDay.set(dayKey(a.date), a.status as AttendanceStatus)
  }
  const takenDates = intern.attendance.map((a) => dayKey(a.date))
  const relevantAttendance = intern.attendance.filter((a) => a.status !== "leave")
  const attendanceRateLabel =
    relevantAttendance.length === 0
      ? "—"
      : `${Math.round(
          (relevantAttendance.reduce(
            (sum, a) => sum + (a.status === "present" ? 1 : a.status === "half-day" ? 0.5 : 0),
            0,
          ) /
            relevantAttendance.length) *
            100,
        )}%`
  const { cells, monthLabel } = buildMonthGrid(pointsByDay, tasksByDay, attendanceByDay)
  const recent = intern.entries.slice(0, 15)

  return (
    <InternPortalView
      intern={intern}
      endDate={endDate}
      progress={progress}
      hasEnded={hasEnded}
      total={total}
      pointsToday={pointsToday}
      pointsThisWeek={pointsThisWeek}
      attendanceRateLabel={attendanceRateLabel}
      leaveBalance={leaveBalance}
      takenDates={takenDates}
      cells={cells}
      monthLabel={monthLabel}
      recent={recent}
      taskNames={taskNames}
    />
  )
}
