// lib/engage/usage.ts — per-user, per-feature generation counts by calendar
// day and month (UTC), and reserving one against a limit.
//
// Race-safe without locks: the row is created if missing (INSERT … ON
// CONFLICT DO NOTHING), then incremented with a single conditional UPDATE
// (… WHERE count < limit). Postgres re-checks that condition on the row it
// locks, so two requests racing for the last slot can't both get it — the
// same technique as the free-generation counter in lib/extAccess.ts.
import { db } from "@/lib/db"
import type { EngageUsageKind, Limit, LimitPeriod } from "@/lib/engage/features"

export function periodStart(period: LimitPeriod, now: Date): Date {
  return period === "day"
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

async function incrementIfUnder(
  userId: string,
  feature: EngageUsageKind,
  period: LimitPeriod,
  start: Date,
  limit: Limit,
): Promise<boolean> {
  if (limit !== "unlimited" && limit <= 0) return false
  await db.engageUsageCounter.createMany({
    data: [{ userId, feature, period, periodStart: start, count: 0 }],
    skipDuplicates: true,
  })
  const { count } = await db.engageUsageCounter.updateMany({
    where: {
      userId,
      feature,
      period,
      periodStart: start,
      ...(limit === "unlimited" ? {} : { count: { lt: limit } }),
    },
    data: { count: { increment: 1 } },
  })
  return count === 1
}

async function decrement(userId: string, feature: EngageUsageKind, period: LimitPeriod, start: Date): Promise<void> {
  await db.engageUsageCounter.updateMany({
    where: { userId, feature, period, periodStart: start, count: { gt: 0 } },
    data: { count: { decrement: 1 } },
  })
}

export type UsageReservation =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; period: LimitPeriod; limit: number }

// Counts one generation of this kind for today and this month, unless that
// would go past a limit. Every generation is counted, limited or not, so the
// admin's usage figures cover everyone.
export async function reserveUsage(
  userId: string,
  feature: EngageUsageKind,
  limits: { day: Limit; month: Limit },
  now: Date = new Date(),
): Promise<UsageReservation> {
  const day = periodStart("day", now)
  const month = periodStart("month", now)

  if (!(await incrementIfUnder(userId, feature, "day", day, limits.day))) {
    return { ok: false, period: "day", limit: limits.day as number }
  }
  if (!(await incrementIfUnder(userId, feature, "month", month, limits.month))) {
    await decrement(userId, feature, "day", day)
    return { ok: false, period: "month", limit: limits.month as number }
  }

  let released = false
  return {
    ok: true,
    // Gives the counts back when the generation fails, so a user is never
    // charged against a limit for output they never got.
    release: async () => {
      if (released) return
      released = true
      await Promise.all([decrement(userId, feature, "day", day), decrement(userId, feature, "month", month)])
    },
  }
}

export interface UsageSnapshot {
  day: Partial<Record<EngageUsageKind, number>>
  month: Partial<Record<EngageUsageKind, number>>
}

// Today's and this month's counts for one user, every kind.
export async function readUsage(userId: string, now: Date = new Date()): Promise<UsageSnapshot> {
  const day = periodStart("day", now)
  const month = periodStart("month", now)
  const rows = await db.engageUsageCounter.findMany({
    where: {
      userId,
      OR: [
        { period: "day", periodStart: day },
        { period: "month", periodStart: month },
      ],
    },
    select: { feature: true, period: true, count: true },
  })
  const snapshot: UsageSnapshot = { day: {}, month: {} }
  for (const row of rows) {
    snapshot[row.period as LimitPeriod][row.feature as EngageUsageKind] = row.count
  }
  return snapshot
}

// Clears today's and/or this month's counts (an admin "reset usage").
export async function resetUsage(userId: string, periods: LimitPeriod[], now: Date = new Date()): Promise<number> {
  const { count } = await db.engageUsageCounter.updateMany({
    where: {
      userId,
      OR: periods.map((period) => ({ period, periodStart: periodStart(period, now) })),
    },
    data: { count: 0 },
  })
  return count
}
