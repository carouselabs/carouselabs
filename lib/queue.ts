// lib/queue.ts
// Buffer-style posting queue: users set preset (dayOfWeek, timeOfDay,
// platform) slots, and "Add to Queue" assigns a new post to the next
// available (unbooked) occurrence of one of their slots for that platform —
// a smarter default time picker, nothing more. Once assigned, the resulting
// scheduledFor is just a normal ScheduledPost row and flows through the
// existing scheduling/cron publishing system unchanged (see
// app/api/content-hub/scheduled/route.ts's `useQueue` handling).
import { db } from "@/lib/db"

// Comfortably more than any real queue backlog — a safety cap, not a
// meaningful product limit.
const LOOKAHEAD_WEEKS = 8

interface ZonedYMD {
  year: number
  month: number
  day: number
  weekday: number
}

function getZonedYMD(date: Date, timeZone: string): ZonedYMD {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdayMap[map.weekday] ?? date.getUTCDay(),
  }
}

// Converts a wall-clock date+time AS SEEN in `timeZone` to the UTC instant it
// represents — guess-and-correct-once. Accurate except right at a DST
// transition, an imprecision this codebase already accepts elsewhere (the
// cron's own 5-minute due-window, the suggestions route's hour-level scan).
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guess)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const renderedAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    map.hour === "24" ? 0 : Number(map.hour),
    Number(map.minute),
    0,
  )
  return new Date(guess.getTime() + (guess.getTime() - renderedAsUtc))
}

// The next LOOKAHEAD_WEEKS occurrences of one (dayOfWeek, timeOfDay) slot,
// earliest first, starting strictly after `now`.
function slotOccurrences(dayOfWeek: number, timeOfDay: string, timeZone: string, now: Date): Date[] {
  const [hour, minute] = timeOfDay.split(":").map(Number)
  const today = getZonedYMD(now, timeZone)
  const daysUntil = (dayOfWeek - today.weekday + 7) % 7
  const candidateDay = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000)
  const ymd = getZonedYMD(candidateDay, timeZone)

  let first = zonedWallTimeToUtc(ymd.year, ymd.month, ymd.day, hour || 0, minute || 0, timeZone)
  if (first.getTime() <= now.getTime()) {
    first = new Date(first.getTime() + 7 * 24 * 60 * 60 * 1000)
  }

  return Array.from({ length: LOOKAHEAD_WEEKS }, (_, w) => new Date(first.getTime() + w * 7 * 24 * 60 * 60 * 1000))
}

// Finds the earliest future occurrence, across all the user's active
// QueueSlots FOR THIS PLATFORM, that doesn't already have a ScheduledPost
// booked at that exact instant. Returns null if the user has no active queue
// slots for this platform, or every occurrence in the lookahead window is
// already taken (both surfaced as a clear error by the caller).
export async function nextAvailableQueueSlot(
  userId: string,
  platform: string,
  timeZone: string,
): Promise<Date | null> {
  const slots = await db.queueSlot.findMany({ where: { userId, platform, active: true } })
  if (slots.length === 0) return null

  const now = new Date()
  const candidates = slots
    .flatMap((slot) => slotOccurrences(slot.dayOfWeek, slot.timeOfDay, timeZone, now))
    .sort((a, b) => a.getTime() - b.getTime())

  const existing = await db.scheduledPost.findMany({
    where: { userId, platform, status: { not: "cancelled" } },
    select: { scheduledFor: true },
  })
  const booked = new Set(existing.map((s) => s.scheduledFor.getTime()))

  for (const candidate of candidates) {
    if (!booked.has(candidate.getTime())) return candidate
  }
  return null
}
