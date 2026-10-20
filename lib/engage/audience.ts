// lib/engage/audience.ts
// Who counts as a user of each Engage extension, for email audiences
// (broadcasts, scheduled emails, sequences): someone who signed in to that
// extension, or generated anything with it. The same rule as the admin's
// Engage users list (USES in lib/engage/adminQueries.ts), so a broadcast to
// "Engage for X users" reaches the people that list shows for X.
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ENGAGE_FEATURES, X_DEVICE_PREFIX, X_FEATURES, type EngagePlatform } from "@/lib/engage/features"
import { kindsFor } from "@/lib/extensionHistory"

// A sign-in belongs to the X extension when its device label says so
// (X_DEVICE_PREFIX); every other one, including unlabelled ones, to LinkedIn.
function tokenOf(platform: EngagePlatform): Prisma.ExtensionTokenWhereInput {
  return platform === "x"
    ? { device: { startsWith: X_DEVICE_PREFIX } }
    : { OR: [{ device: null }, { NOT: { device: { startsWith: X_DEVICE_PREFIX } } }] }
}

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
//   - the free-trial counter (User.extensionTrialUsed / xTrialUsed): lifetime,
//     but only trial generations, so it stays 0 for paid and granted users;
//   - their saved history (CommentHistory): every generation, last 90 days;
//   - the AI call log (EngageAiCall, outcome ok): every generation since it
//     was added in October 2026.
export const LOW_USE_MAX_GENERATIONS = 1

export const ENGAGE_LOW_USE_SEGMENTS: Record<string, EngagePlatform> = {
  engage_linkedin_low: "linkedin",
  engage_x_low: "x",
}

const GENERATION_KINDS: Record<EngagePlatform, string[]> = {
  linkedin: ENGAGE_FEATURES.filter((f) => !X_FEATURES.includes(f)),
  x: [...X_FEATURES],
}

export function generationsUsed(counts: { trial: number; history: number; aiCalls: number }): number {
  return Math.max(counts.trial, counts.history, counts.aiCalls)
}

/** Everyone (or just `onlyUserId`) who installed that extension and used it once or never. */
export async function lowUseEngageUsers(platform: EngagePlatform, onlyUserId?: string): Promise<{ id: string; email: string }[]> {
  const users = await db.user.findMany({
    where: { deletedAt: null, ...(onlyUserId ? { id: onlyUserId } : {}), extensionTokens: { some: tokenOf(platform) } },
    select: { id: true, email: true, extensionTrialUsed: true, xTrialUsed: true },
  })
  if (users.length === 0) return []
  const ids = users.map((u) => u.id)
  const [history, calls] = await Promise.all([
    db.commentHistory.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, kind: { in: [...kindsFor(platform)] } },
      _count: { _all: true },
    }),
    db.engageAiCall.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, outcome: "ok", kind: { in: GENERATION_KINDS[platform] } },
      _count: { _all: true },
    }),
  ])
  const historyBy = new Map(history.map((h) => [h.userId, h._count._all]))
  const callsBy = new Map(calls.flatMap((c) => (c.userId ? [[c.userId, c._count._all] as const] : [])))
  return users
    .filter(
      (u) =>
        generationsUsed({
          trial: platform === "x" ? u.xTrialUsed : u.extensionTrialUsed,
          history: historyBy.get(u.id) ?? 0,
          aiCalls: callsBy.get(u.id) ?? 0,
        }) <= LOW_USE_MAX_GENERATIONS,
    )
    .map((u) => ({ id: u.id, email: u.email }))
}
