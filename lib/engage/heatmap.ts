// lib/engage/heatmap.ts — the "comments per day" grid's arithmetic, kept
// apart from the component so it can be tested: which shade a day gets, the
// weeks to draw, and this month's totals. Dates are local calendar days
// ("2026-11-12"), the same keys app/api/ext/activity returns.

// Five shades, lightest to darkest, and the counts each one covers.
export const HEAT_SHADES = ["#EBE8F7", "#CFC6FB", "#A28FF6", "#6D4CF0", "#3A1EC2"] as const
export const HEAT_RANGES = ["0", "1–3", "4–7", "8–11", "12+"] as const

export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count <= 3) return 1
  if (count <= 7) return 2
  if (count <= 11) return 3
  return 4
}

const pad = (n: number) => String(n).padStart(2, "0")

// A Date's calendar day where the code runs (the browser: the person's own).
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export interface HeatCell {
  key: string
  date: Date
  // After today: drawn as an empty outline (a month's days still to come).
  future: boolean
}

// GitHub's layout: one column per week, Sunday at the top, the last column
// holding today. `weeks` columns, so 13 cover the 90 days history is kept.
export function heatWeeks(today: Date, weeks: number): HeatCell[][] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const firstSunday = new Date(end.getFullYear(), end.getMonth(), end.getDate() - end.getDay() - (weeks - 1) * 7)
  const columns: HeatCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const column: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      // Built from the calendar, not by adding milliseconds, so a clock
      // change never repeats or skips a day.
      const date = new Date(firstSunday.getFullYear(), firstSunday.getMonth(), firstSunday.getDate() + w * 7 + d)
      column.push({ key: localDayKey(date), date, future: date > end })
    }
    columns.push(column)
  }
  return columns
}

// One month as a calendar: Sunday-first weeks, null before the 1st.
export function monthCells(today: Date): (HeatCell | null)[] {
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const cells: (HeatCell | null)[] = Array.from({ length: first.getDay() }, () => null)
  for (let d = 1; d <= days; d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), d)
    cells.push({ key: localDayKey(date), date, future: date > end })
  }
  return cells
}

export interface MonthSummary {
  total: number
  // The busiest day so far this month (null when there were none).
  best: { key: string; count: number } | null
  activeDays: number
  // Days of the month so far, today included.
  daysSoFar: number
}

export function monthSummary(counts: ReadonlyMap<string, number>, today: Date): MonthSummary {
  const prefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-`
  let total = 0
  let activeDays = 0
  let best: MonthSummary["best"] = null
  for (const [key, count] of counts) {
    if (!key.startsWith(prefix) || count <= 0) continue
    // Nothing from after today counts, should a clock disagree.
    if (Number(key.slice(prefix.length)) > today.getDate()) continue
    total += count
    activeDays += 1
    if (!best || count > best.count || (count === best.count && key < best.key)) best = { key, count }
  }
  return { total, best, activeDays, daysSoFar: today.getDate() }
}
