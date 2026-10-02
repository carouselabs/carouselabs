// lib/engage/ranges.ts — the overview's date ranges, as [from, to) in UTC.
// Pure, unit-tested.

export const RANGE_KEYS = ["today", "yesterday", "7d", "30d", "90d", "this_month", "last_month", "custom"] as const
export type RangeKey = (typeof RANGE_KEYS)[number]

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom",
}

const DAY = 86_400_000
const MAX_DAYS = 366

const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

export function resolveRange(
  key: string | null,
  fromParam: string | null,
  toParam: string | null,
  now: Date = new Date(),
): { key: RangeKey; from: Date; to: Date } | null {
  const k = (RANGE_KEYS as readonly string[]).includes(key ?? "") ? (key as RangeKey) : "30d"
  const today = utcDay(now)
  const tomorrow = new Date(today.getTime() + DAY)
  switch (k) {
    case "today":
      return { key: k, from: today, to: tomorrow }
    case "yesterday":
      return { key: k, from: new Date(today.getTime() - DAY), to: today }
    case "7d":
      return { key: k, from: new Date(tomorrow.getTime() - 7 * DAY), to: tomorrow }
    case "30d":
      return { key: k, from: new Date(tomorrow.getTime() - 30 * DAY), to: tomorrow }
    case "90d":
      return { key: k, from: new Date(tomorrow.getTime() - 90 * DAY), to: tomorrow }
    case "this_month":
      return { key: k, from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to: tomorrow }
    case "last_month":
      return {
        key: k,
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
        to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      }
    case "custom": {
      const day = /^\d{4}-\d{2}-\d{2}$/
      if (!fromParam || !toParam || !day.test(fromParam) || !day.test(toParam)) return null
      const from = new Date(`${fromParam}T00:00:00.000Z`)
      const to = new Date(new Date(`${toParam}T00:00:00.000Z`).getTime() + DAY) // inclusive end day
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return null
      if ((to.getTime() - from.getTime()) / DAY > MAX_DAYS) return null
      return { key: k, from, to }
    }
  }
}
