// src/lib/heatmap.ts — the arithmetic behind Profile's "comments per day"
// grid: which shade a day gets and this month's totals. The website's
// Engage → Activity grid uses the same rules (lib/engage/heatmap.ts there);
// both read app/api/ext/activity. Days are local calendar days, "2026-11-12".

// Five shades, none → most, and the counts each one covers.
export const HEAT_RANGES = ["0", "1–3", "4–7", "8–11", "12+"] as const;

export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 11) return 3;
  return 4;
}

const pad = (n: number) => String(n).padStart(2, "0");

// A Date's calendar day in the browser's own zone.
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface DayCell {
  key: string;
  date: Date;
  // After today: drawn as an empty outline, not clickable.
  future: boolean;
}

// One month as a calendar: Sunday-first weeks, null before the 1st.
export function monthCells(today: Date): (DayCell | null)[] {
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const cells: (DayCell | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), d);
    cells.push({ key: localDayKey(date), date, future: date > end });
  }
  return cells;
}

export interface MonthSummary {
  total: number;
  // The busiest day so far (the earlier one on a tie); null when none yet.
  best: { key: string; count: number } | null;
  activeDays: number;
  daysSoFar: number;
}

export function monthSummary(counts: ReadonlyMap<string, number>, today: Date): MonthSummary {
  const prefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-`;
  let total = 0;
  let activeDays = 0;
  let best: MonthSummary["best"] = null;
  for (const [key, count] of counts) {
    if (!key.startsWith(prefix) || count <= 0) continue;
    if (Number(key.slice(prefix.length)) > today.getDate()) continue;
    total += count;
    activeDays += 1;
    if (!best || count > best.count || (count === best.count && key < best.key)) best = { key, count };
  }
  return { total, best, activeDays, daysSoFar: today.getDate() };
}
