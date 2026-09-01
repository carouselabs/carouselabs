// lib/internPoints.ts
// Shared helpers for the intern points board — date-window math (used
// identically by the admin API and the intern's own portal API), predefined
// vs custom entry detection, and the automated-award hook wired to nothing
// yet (see spec).
import { db } from "@/lib/db"

// Pure duration/date-formatting helpers live in lib/internDuration.ts (no
// @/lib/db import) so client components can import them directly without
// pulling Prisma into the browser bundle. Re-exported here so every existing
// server-side `import { calculateEndDate, ... } from "@/lib/internPoints"`
// keeps working unchanged.
export * from "./internDuration"

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Rolling 7-day window (today - 6 days) — sidesteps Sun-vs-Mon
// start-of-week ambiguity while still reading as "this week".
export function startOfWeek(d: Date = new Date()): Date {
  const start = startOfDay(d)
  start.setDate(start.getDate() - 6)
  return start
}

export function summarizeEntries(entries: { points: number; date: Date }[]) {
  const today = startOfDay()
  const weekStart = startOfWeek()
  let total = 0
  let pointsToday = 0
  let pointsThisWeek = 0
  for (const e of entries) {
    total += e.points
    if (e.date >= today) pointsToday += e.points
    if (e.date >= weekStart) pointsThisWeek += e.points
  }
  return { total, pointsToday, pointsThisWeek }
}

export type LeaderboardPeriod = "all" | "month" | "week"

// Calendar-aligned period boundaries for the leaderboard — every intern is
// compared against the same 1st-of-month or Mon-Sun window regardless of
// when they joined. Distinct from startOfWeek() above (a rolling 7-day
// window used for the intern portal's "This Week" stat tile), which is
// intentionally NOT calendar-aligned.
export function getPeriodRange(period: LeaderboardPeriod, now: Date = new Date()): { start: Date; end: Date } | null {
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (period === "week") {
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const start = startOfDay(now)
    start.setDate(start.getDate() - daysSinceMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  return null
}

// Active interns ranked by points within an arbitrary date range, descending
// (null range = all-time). Split out from getLeaderboard() so callers that
// need a range getPeriodRange() doesn't produce directly — e.g. "last
// calendar week" for the weekly performance email (see
// lib/internWeeklyEmail.ts) — can still reuse the same query/sort.
export async function getLeaderboardForRange(
  range: { start: Date; end: Date } | null,
): Promise<{ id: string; name: string; totalPoints: number }[]> {
  const interns = await db.intern.findMany({
    where: { active: true },
    include: {
      entries: {
        where: range ? { date: { gte: range.start, lte: range.end } } : undefined,
        select: { points: true },
      },
    },
  })
  return interns
    .map((i) => ({
      id: i.id,
      name: i.name,
      totalPoints: i.entries.reduce((sum, e) => sum + e.points, 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}

// Active interns ranked by points within `period`, descending — the
// leaderboard shown in both the admin panel and the intern portal. Only
// name + total are exposed here; callers that need per-intern detail (email,
// today/week splits) should compute those separately.
export async function getLeaderboard(
  period: LeaderboardPeriod = "all",
): Promise<{ id: string; name: string; totalPoints: number }[]> {
  return getLeaderboardForRange(getPeriodRange(period))
}

// Names of every PredefinedTask (active and inactive — tasks are never
// renamed, only soft-deleted, so old entries stay matched). Used to tag
// which InternPointEntry rows came from a Quick Task vs a Custom Task.
export async function predefinedTaskNames(): Promise<Set<string>> {
  const tasks = await db.predefinedTask.findMany({ select: { name: true } })
  return new Set(tasks.map((t) => t.name))
}

// Self-service leave is auto-approved, so "used" is just the count of
// approved requests — no separate ledger to keep in sync.
export function getLeaveBalance(intern: { leaveAllowance: number }, approvedLeaveCount: number) {
  const used = approvedLeaveCount
  const remaining = Math.max(0, intern.leaveAllowance - used)
  return { total: intern.leaveAllowance, used, remaining }
}

// All-time present/absent/half-day counts → a coarse traffic-light flag.
// "leave" days are excluded (excused, not a sign of disengagement). No
// attendance history at all reads as "good" rather than penalizing a
// brand-new intern who hasn't had a day marked yet.
export function getAttendanceFlag(
  presentDays: number,
  absentDays: number,
  halfDays: number,
): "good" | "warning" | "critical" {
  const total = presentDays + absentDays + halfDays
  if (total === 0) return "good"
  const rate = (presentDays + halfDays * 0.5) / total
  if (rate < 0.6) return "critical"
  if (rate < 0.8) return "warning"
  return "good"
}

// Counts consecutive "absent" days working backward from the most recent
// attendance record, stopping at the first non-absent status. Callers should
// pass records in any order — they're sorted here.
export function getConsecutiveAbsences(recentAttendance: { date: Date; status: string }[]): number {
  const sorted = [...recentAttendance].sort((a, b) => b.date.getTime() - a.date.getTime())
  let count = 0
  for (const a of sorted) {
    if (a.status !== "absent") break
    count++
  }
  return count
}

// Not wired to any trigger yet — ready to be called from anywhere in the
// codebase later (e.g. auto-award points when an intern completes a
// specific tracked task).
export async function logAutomatedPoints(
  internEmail: string,
  points: number,
  category: string,
  note?: string,
) {
  const intern = await db.intern.findUnique({ where: { email: internEmail } })
  if (!intern || !intern.active) return
  await db.internPointEntry.create({
    data: { internId: intern.id, points, category, note, source: "automated", addedBy: "system" },
  })
}
