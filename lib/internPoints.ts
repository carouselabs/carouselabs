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
