// lib/groupEntries.ts
// Pure, dependency-free grouping logic for the intern points board's Daily
// Log view. Deliberately has no imports (not even lib/db) so it's safe to
// use from both server code (API routes) and client components ("use
// client" files can't import lib/internPoints.ts — that pulls Prisma into
// the browser bundle via its top-level lib/db import).
export type GroupableEntry = {
  id: string
  date: string // ISO date string
  points: number
  category: string
  note: string | null
  source: string
  addedBy: string
  isPredefinedTask: boolean
}

export type DailyGroup = {
  date: string // yyyy-mm-dd
  totalPoints: number
  taskNames: string[]
  entries: GroupableEntry[]
}

export function groupEntriesByDate<T extends GroupableEntry>(entries: T[]): DailyGroup[] {
  const map = new Map<string, DailyGroup>()
  for (const e of entries) {
    const key = e.date.slice(0, 10)
    let group = map.get(key)
    if (!group) {
      group = { date: key, totalPoints: 0, taskNames: [], entries: [] }
      map.set(key, group)
    }
    group.totalPoints += e.points
    group.entries.push(e)
    if (!group.taskNames.includes(e.category)) group.taskNames.push(e.category)
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export type AttendanceStatus = "present" | "absent" | "half-day" | "leave"

export type AttendanceRecord = {
  id: string
  date: string // ISO date string
  status: string
  note: string | null
  markedBy: string
}

export type DailyRecord = {
  date: string // yyyy-mm-dd
  totalPoints: number
  taskNames: string[]
  entries: GroupableEntry[]
  attendance: AttendanceRecord | null
}

// Like groupEntriesByDate, but also folds in attendance — so a day that's
// marked "absent" with zero point entries still shows up as its own row
// (points-only grouping would silently drop it).
export function mergeDailyRecords<T extends GroupableEntry, A extends AttendanceRecord>(
  entries: T[],
  attendance: A[],
): DailyRecord[] {
  const map = new Map<string, DailyRecord>()
  const get = (key: string) => {
    let r = map.get(key)
    if (!r) {
      r = { date: key, totalPoints: 0, taskNames: [], entries: [], attendance: null }
      map.set(key, r)
    }
    return r
  }
  for (const e of entries) {
    const r = get(e.date.slice(0, 10))
    r.totalPoints += e.points
    r.entries.push(e)
    if (!r.taskNames.includes(e.category)) r.taskNames.push(e.category)
  }
  for (const a of attendance) {
    get(a.date.slice(0, 10)).attendance = a
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}
