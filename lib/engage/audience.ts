// lib/engage/audience.ts
// Who counts as a user of each Engage extension, for email audiences
// (broadcasts, scheduled emails, sequences): someone who signed in to that
// extension, or generated anything with it. The same rule as the admin's
// Engage users list (USES in lib/engage/adminQueries.ts), so a broadcast to
// "Engage for X users" reaches the people that list shows for X.
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { PLATFORM_FEATURES, type EngagePlatform } from "@/lib/engage/features"
import { tokenWhere as tokenOf } from "@/lib/engage/platformQueries"
import { FREE_USED_COLUMNS, FREE_USED_SELECT, type FreeUsedColumn } from "@/lib/engage/subscriptions"
import { kindsFor } from "@/lib/extensionHistory"

export function usesEngageWhere(platform: EngagePlatform): Prisma.UserWhereInput {
  return {
    OR: [
      { extensionTokens: { some: tokenOf(platform) } },
      { commentHistory: { some: { kind: { in: [...kindsFor(platform)] } } } },
    ],
  }
}

// The audience values (lib/segments.ts) for each extension's users.
export const ENGAGE_SEGMENTS: Record<string, EngagePlatform> = {
  engage_linkedin: "linkedin",
  engage_x: "x",
}

// ── "Installed, used it once or never" ──────────────────────────────────
// People who signed in to an extension (the only sign the app has that it's
// installed) but have made at most one real generation with it: comments,
// replies, connection notes and messages (X: replies and messages).
//
// Each record of use undercounts somewhere, so the highest of three counts:
//   - the free-trial counter (FREE_USED_COLUMNS): lifetime,
//     but only trial generations, so it stays 0 for paid and granted users;
//   - their saved history (CommentHistory): every generation, last 90 days;
//   - the AI call log (EngageAiCall, outcome ok): every generation since it
//     was added in October 2026.
export const LOW_USE_MAX_GENERATIONS = 1

export const ENGAGE_LOW_USE_SEGMENTS: Record<string, EngagePlatform> = {
  engage_linkedin_low: "linkedin",
  engage_x_low: "x",
}


export function generationsUsed(counts: { trial: number; history: number; aiCalls: number }): number {
  return Math.max(counts.trial, counts.history, counts.aiCalls)
}

/** Everyone (or just `onlyUserId`) who installed that extension and used it once or never. */
/**
 * How much each of these people has used one extension: real generations
 * (the highest of the three counts above) and when they last used it.
 */
export async function engageUsage(
  platform: EngagePlatform,
  users: ({ id: string } & Record<FreeUsedColumn, number>)[],
): Promise<Map<string, { generations: number; lastUsedAt: Date | null }>> {
  const ids = users.map((u) => u.id)
  const [history, calls] = ids.length
    ? await Promise.all([
        db.commentHistory.groupBy({
          by: ["userId"],
          where: { userId: { in: ids }, kind: { in: [...kindsFor(platform)] } },
          _count: { _all: true },
          _max: { createdAt: true },
        }),
        db.engageAiCall.groupBy({
          by: ["userId"],
          where: { userId: { in: ids }, outcome: "ok", kind: { in: PLATFORM_FEATURES[platform] } },
          _count: { _all: true },
          _max: { createdAt: true },
        }),
      ])
    : [[], []]
  const historyBy = new Map(history.map((h) => [h.userId, h]))
  const callsBy = new Map(calls.flatMap((c) => (c.userId ? [[c.userId, c] as const] : [])))
  const latest = (...dates: (Date | null | undefined)[]) =>
    dates.reduce<Date | null>((a, d) => (d && (!a || d > a) ? d : a), null)
  return new Map(
    users.map((u) => {
      const h = historyBy.get(u.id)
      const c = callsBy.get(u.id)
      return [
        u.id,
        {
          generations: generationsUsed({
            trial: u[FREE_USED_COLUMNS[platform]],
            history: h?._count._all ?? 0,
            aiCalls: c?._count._all ?? 0,
          }),
          lastUsedAt: latest(h?._max?.createdAt, c?._max?.createdAt),
        },
      ]
    }),
  )
}

/** Everyone (or just `onlyUserId`) who installed that extension and used it once or never. */
export async function lowUseEngageUsers(platform: EngagePlatform, onlyUserId?: string): Promise<{ id: string; email: string }[]> {
  const users = await db.user.findMany({
    where: { deletedAt: null, ...(onlyUserId ? { id: onlyUserId } : {}), extensionTokens: { some: tokenOf(platform) } },
    select: { id: true, email: true, ...FREE_USED_SELECT },
  })
  if (users.length === 0) return []
  const usage = await engageUsage(platform, users)
  return users
    .filter((u) => (usage.get(u.id)?.generations ?? 0) <= LOW_USE_MAX_GENERATIONS)
    .map((u) => ({ id: u.id, email: u.email }))
}

/** Whether this person is signed in to that extension (the sign it's installed). */
export async function signedInToEngage(platform: EngagePlatform, userId: string): Promise<boolean> {
  return (await db.extensionToken.count({ where: { userId, ...tokenOf(platform) } })) > 0
}
