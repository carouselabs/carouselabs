// lib/internWeeklyEmail.ts
// Builds the per-intern payload for the Weekly Performance email (see
// app/api/cron/intern-weekly-performance-email and
// emails/InternWeeklyPerformanceEmail). Composes lib/internPoints.ts's
// calendar-week leaderboard primitives into one intern-specific object that
// also decides which of the 4 tones (see Step 2 in the spec) applies.
import { db } from "@/lib/db"
import { getLeaderboardForRange, getPeriodRange } from "@/lib/internPoints"
import type { WeeklyPerformanceEmailProps, WeeklyPerformanceTone } from "@/emails/InternWeeklyPerformanceEmail"

export type WeeklyPerformanceData = WeeklyPerformanceEmailProps & {
  internId: string
  email: string
  pointsLastWeek: number
  halfDays: number
  leaveDays: number
}

// 2+ absences in a single week is treated as an engagement concern worth a
// supportive nudge (TONE D), independent of points/rank — an intern who was
// fully present but merely dropped a spot still gets TONE B/C instead.
const ATTENDANCE_CONCERN_ABSENCES = 2
// A rank improvement of 3+ spots earns the "Most Improved" badge on top of
// TONE B's copy — smaller improvements still get TONE B, just no badge.
const MOST_IMPROVED_THRESHOLD = 3

function fmtRangeLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const endLabel = end.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })
  return `${startLabel} - ${endLabel}`
}

function decideTone(
  rankThisWeek: number,
  rankDelta: number | null,
  pointsThisWeek: number,
  absentDays: number,
): WeeklyPerformanceTone {
  // Priority order (highest first) — see Step 2:
  //  1. Attendance concern always reads as "needs a push," even for an
  //     otherwise strong week, since it's a distinct engagement signal.
  //  2. Top 3 this week is a clear win regardless of the prior week.
  //  3. A dropped rank or zero/negative points, on their own, still need a
  //     supportive nudge.
  //  4. Everything else that improved gets the encouragement tone.
  //  5. Otherwise, steady.
  if (absentDays >= ATTENDANCE_CONCERN_ABSENCES) return "needs_push"
  if (rankThisWeek <= 3) return "top"
  if (rankDelta !== null && rankDelta < 0) return "needs_push"
  if (pointsThisWeek <= 0) return "needs_push"
  if (rankDelta !== null && rankDelta > 0) return "moved_up"
  return "steady"
}

export async function generateWeeklyPerformanceData(internId: string): Promise<WeeklyPerformanceData> {
  const intern = await db.intern.findUnique({ where: { id: internId } })
  if (!intern || !intern.active) {
    throw new Error(`generateWeeklyPerformanceData: intern ${internId} not found or inactive`)
  }

  const thisWeekRange = getPeriodRange("week")
  if (!thisWeekRange) throw new Error("generateWeeklyPerformanceData: getPeriodRange('week') returned null")

  // Any timestamp inside last week resolves getPeriodRange("week", ...) to
  // last week's Mon-Sun bounds — the weekday-offset math is identical
  // regardless of which week `now` falls in.
  const lastWeekAnchor = new Date(thisWeekRange.start)
  lastWeekAnchor.setDate(lastWeekAnchor.getDate() - 1)
  const lastWeekRange = getPeriodRange("week", lastWeekAnchor)
  if (!lastWeekRange) throw new Error("generateWeeklyPerformanceData: getPeriodRange('week', anchor) returned null")

  const [thisWeekBoard, lastWeekBoard, attendance] = await Promise.all([
    getLeaderboardForRange(thisWeekRange),
    getLeaderboardForRange(lastWeekRange),
    db.internAttendance.findMany({
      where: { internId, date: { gte: thisWeekRange.start, lte: thisWeekRange.end } },
      select: { status: true },
    }),
  ])

  const thisWeekIdx = thisWeekBoard.findIndex((r) => r.id === internId)
  if (thisWeekIdx === -1) {
    throw new Error(`generateWeeklyPerformanceData: intern ${internId} missing from this week's leaderboard`)
  }
  const rankThisWeek = thisWeekIdx + 1
  const pointsThisWeek = thisWeekBoard[thisWeekIdx].totalPoints

  const lastWeekIdx = lastWeekBoard.findIndex((r) => r.id === internId)
  const rankLastWeek = lastWeekIdx === -1 ? null : lastWeekIdx + 1
  const pointsLastWeek = lastWeekIdx === -1 ? 0 : lastWeekBoard[lastWeekIdx].totalPoints
  // Positive = improved (numerically lower rank), negative = dropped.
  const rankDelta = rankLastWeek === null ? null : rankLastWeek - rankThisWeek

  const presentDays = attendance.filter((a) => a.status === "present").length
  const absentDays = attendance.filter((a) => a.status === "absent").length
  const halfDays = attendance.filter((a) => a.status === "half-day").length
  const leaveDays = attendance.filter((a) => a.status === "leave").length
  const trackedDays = attendance.length
  const perfectAttendance = trackedDays > 0 && presentDays === trackedDays

  const isHighestPoints = rankThisWeek === 1
  const isMostImproved = rankDelta !== null && rankDelta >= MOST_IMPROVED_THRESHOLD

  const tone = decideTone(rankThisWeek, rankDelta, pointsThisWeek, absentDays)

  return {
    internId: intern.id,
    email: intern.email,
    name: intern.name,
    weekLabel: fmtRangeLabel(thisWeekRange.start, thisWeekRange.end),
    activeInternCount: thisWeekBoard.length,
    rankThisWeek,
    pointsThisWeek,
    rankLastWeek,
    pointsLastWeek,
    rankDelta,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    perfectAttendance,
    isHighestPoints,
    isMostImproved,
    tone,
  }
}
