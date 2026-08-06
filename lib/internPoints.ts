// lib/internPoints.ts
// Shared helpers for the intern points board — date-window math (used
// identically by the admin API and the intern's own portal API), predefined
// vs custom entry detection, and the automated-award hook wired to nothing
// yet (see spec).
import { db } from "@/lib/db"

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

// Active interns ranked by all-time total points, descending — the
// leaderboard shown in both the admin panel and the intern portal. Only
// name + total are exposed here; callers that need per-intern detail (email,
// today/week splits) should compute those separately.
export async function getLeaderboard(): Promise<{ id: string; name: string; totalPoints: number }[]> {
  const interns = await db.intern.findMany({
    where: { active: true },
    include: { entries: { select: { points: true } } },
  })
  return interns
    .map((i) => ({
      id: i.id,
      name: i.name,
      totalPoints: i.entries.reduce((sum, e) => sum + e.points, 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
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

// Adds durationMonths to joinDate — used on create and on every extension to
// (re)compute Intern.endDate, which is stored (not derived on read) so it can
// be queried/sorted directly.
export function calculateEndDate(joinDate: Date, durationMonths: number): Date {
  const end = new Date(joinDate)
  end.setMonth(end.getMonth() + durationMonths)
  return end
}

// Percent-through and days-left for the internship window, clamped to
// [0, 100] / [0, ∞) so a not-yet-started or already-ended internship never
// renders a nonsensical progress bar.
export function getInternshipProgress(joinDate: Date, endDate: Date) {
  const now = new Date()
  const total = endDate.getTime() - joinDate.getTime()
  const elapsed = now.getTime() - joinDate.getTime()
  const percentComplete = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const isCompleted = now > endDate
  return { percentComplete, daysRemaining, isCompleted }
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
