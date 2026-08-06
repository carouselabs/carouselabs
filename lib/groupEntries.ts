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
