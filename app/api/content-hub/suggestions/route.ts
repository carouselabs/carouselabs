import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

// v1 is rule-based, not learned from the user's own engagement data — Tue,
// Wed, Thu mornings are a widely-cited safe default for professional content.
// A future version can replace this with per-user historical performance.
const GOOD_DAYS = [2, 3, 4] // 0=Sun..6=Sat — Tue, Wed, Thu
const GOOD_HOURS = [8, 9, 10]
const WHY_BY_HOUR: Record<number, string> = {
  8: "Early risers catch this before their inbox fills up.",
  9: "Peak engagement window as professionals start their day.",
  10: "Still inside the morning peak, for later risers too.",
}
const SEARCH_WINDOW_HOURS = 24 * 14 // look up to 2 weeks ahead

interface ZonedParts {
  dayOfWeek: number
  hour: number
}

// Reads a UTC instant's wall-clock day/hour AS SEEN in `timeZone`, using the
// platform's own IANA tz database (no date library needed for this).
function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date)

  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value

  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  // Intl can format midnight as "24" with hour12: false in some engines.
  const hour = parseInt(map.hour, 10) % 24

  return { dayOfWeek: weekdayMap[map.weekday] ?? date.getUTCDay(), hour }
}

function isSameLocalDay(a: Date, b: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" })
  return fmt.format(a) === fmt.format(b)
}

function formatLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatTimeOnly(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date)
}

// Brute-force hour-by-hour scan rather than timezone-aware date arithmetic —
// simple, correct across DST, and cheap over a 2-week window.
function findNextSlots(from: Date, timeZone: string, count: number): Date[] {
  const results: Date[] = []
  const start = new Date(from)
  start.setUTCSeconds(0, 0)

  for (let i = 0; i < SEARCH_WINDOW_HOURS && results.length < count; i++) {
    const candidate = new Date(start.getTime() + i * 60 * 60 * 1000)
    if (candidate.getTime() <= from.getTime()) continue
    const { dayOfWeek, hour } = getZonedParts(candidate, timeZone)
    if (GOOD_DAYS.includes(dayOfWeek) && GOOD_HOURS.includes(hour)) {
      results.push(candidate)
    }
  }
  return results
}

// GET /api/content-hub/suggestions?tz=IANA/Zone — 2-3 best-time
// recommendations plus a "today" chip (falls back to the next best slot's
// label if today itself has no good window left).
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestedTz = searchParams.get("tz")

  let timeZone = "UTC"
  if (requestedTz) {
    try {
      // Throws RangeError for an invalid IANA zone — cheapest way to validate.
      new Intl.DateTimeFormat("en-US", { timeZone: requestedTz })
      timeZone = requestedTz
    } catch {
      timeZone = "UTC"
    }
  }

  const now = new Date()
  const slots = findNextSlots(now, timeZone, 3)

  const suggestions = slots.map((date) => {
    const { hour } = getZonedParts(date, timeZone)
    return {
      datetime: date.toISOString(),
      label: formatLabel(date, timeZone),
      why: WHY_BY_HOUR[hour] ?? "A historically strong engagement window.",
    }
  })

  const first = slots[0]
  const today = first
    ? {
        datetime: first.toISOString(),
        chipLabel: isSameLocalDay(first, now, timeZone)
          ? `📈 Best time today: ${formatTimeOnly(first, timeZone)}`
          : `📈 Best time: ${formatLabel(first, timeZone)}`,
        why: suggestions[0].why,
      }
    : null

  return NextResponse.json({ suggestions, today })
}
