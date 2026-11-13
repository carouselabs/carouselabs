// lib/engage/activityDays.ts — how many comments (X: replies) someone wrote
// with an Engage extension on each day, for the "comments per day" grids:
// the website's Engage → Activity and the side panel's Profile screen, both
// through app/api/ext/activity.
//
// Days are the person's own calendar days, in the time zone their browser
// sends: a comment at 1 am in Delhi belongs to that day, not the day before in
// UTC. Counted in the database, so the answer is at most one row per day
// however much someone writes.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import type { EngagePlatform } from "@/lib/engage/features"
import { MAIN_HISTORY_KIND } from "@/lib/extensionHistory"

// History is kept for 90 days (app/api/cron/comment-history-cleanup), so a
// longer window would only add empty days.
export const MAX_ACTIVITY_DAYS = 91
export const DEFAULT_ACTIVITY_DAYS = 35

export type ActivityDay = { day: string; count: number }

// A time zone the browser sent, if it is a real one; otherwise UTC.
export function safeTimeZone(value: string | null | undefined): string {
  if (!value || value.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(value)) return "UTC"
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return value
  } catch {
    return "UTC"
  }
}

// "2026-11-12": the calendar day an instant falls on in a time zone.
export function dayKey(date: Date, timeZone: string): string {
  // en-CA writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

export function clampActivityDays(value: string | null): number {
  const n = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(n)) return DEFAULT_ACTIVITY_DAYS
  return Math.min(MAX_ACTIVITY_DAYS, Math.max(1, n))
}

async function countByDay(userId: string, kind: string, timeZone: string, since: Date): Promise<ActivityDay[]> {
  // createdAt is a UTC timestamp without a zone: read it as UTC, then as the
  // person's local time, and take the date.
  const rows = await db.$queryRaw<{ day: string; count: number | bigint }[]>(Prisma.sql`
    SELECT to_char((h."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
           count(*)::int AS count
    FROM public."CommentHistory" h
    WHERE h."userId" = ${userId} AND h.kind = ${kind} AND h."createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `)
  return rows.map((r) => ({ day: r.day, count: Number(r.count) }))
}

// The last `days` calendar days (today included) with at least one, oldest
// first. Days with none are left out; the grids draw them empty.
export async function activityDays(
  userId: string,
  platform: EngagePlatform,
  timeZone: string,
  days: number,
  now: Date = new Date(),
): Promise<ActivityDay[]> {
  // A day of slack, so the first local day is whole whatever the zone; the
  // rows before it are dropped below.
  const since = new Date(now.getTime() - (days + 1) * 86_400_000)
  const firstDay = dayKey(new Date(now.getTime() - (days - 1) * 86_400_000), timeZone)
  const kind = MAIN_HISTORY_KIND[platform].kind
  let rows: ActivityDay[]
  try {
    rows = await countByDay(userId, kind, timeZone, since)
  } catch (err) {
    // A zone the browser knows but this database doesn't: count in UTC
    // rather than fail the page.
    if (timeZone === "UTC") throw err
    rows = await countByDay(userId, kind, "UTC", since)
  }
  return rows.filter((r) => r.day >= firstDay)
}
