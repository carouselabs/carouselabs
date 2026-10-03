// lib/engage/userDetail.ts — everything the admin's user page shows about one
// Engage user, assembled server-side. Metadata only from generations (kind,
// time, what the user did with it), never the generated text or post content.
import { db } from "@/lib/db"
import { loadEngageAccess } from "@/lib/engage/access"
import { ENGAGE_FEATURES, HISTORY_KIND_TO_FEATURE, type EngageFeature } from "@/lib/engage/features"
import { grantState } from "@/lib/engage/grants"
import { periodStart, readUsage } from "@/lib/engage/usage"
import { userAiCost } from "@/lib/engage/aiQueries"
import { loadGlobalSettings } from "@/lib/engage/settings"

const DAY = 86_400_000

export async function engageUserDetail(userId: string, now: Date = new Date()) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      suspendedAt: true,
      deletedAt: true,
      profile: { select: { name: true, headline: true } },
      engageControl: true,
      extensionSubscription: {
        select: { status: true, renewsAt: true, endsAt: true, createdAt: true, lsSubscriptionId: true, customerPortalUrl: true },
      },
    },
  })
  if (!user) return null

  const monthStart = periodStart("month", now)
  const dayStart = periodStart("day", now)
  const since30 = new Date(dayStart.getTime() - 29 * DAY)

  const [access, counters, grants, tokens, clients, notes, tags, historyMonth, historyDay, recent, daily, audit, errors] =
    await Promise.all([
      loadEngageAccess(userId, now),
      readUsage(userId, now),
      db.engageAccessGrant.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.extensionToken.findMany({
        where: { userId },
        orderBy: { lastUsedAt: "desc" },
        select: { id: true, device: true, createdAt: true, lastUsedAt: true, revokedAt: true },
      }),
      db.engageClientInfo.findMany({ where: { userId }, select: { tokenId: true, extensionVersion: true, lastSeenAt: true } }),
      db.adminNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.adminUserTag.findMany({ where: { userId }, orderBy: { tag: "asc" } }),
      db.commentHistory.groupBy({ by: ["kind"], where: { userId, createdAt: { gte: monthStart } }, _count: { _all: true } }),
      db.commentHistory.groupBy({ by: ["kind"], where: { userId, createdAt: { gte: dayStart } }, _count: { _all: true } }),
      db.commentHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, kind: true, action: true, model: true, profileName: true, createdAt: true },
      }),
      db.commentHistory.findMany({
        where: { userId, createdAt: { gte: since30 } },
        select: { kind: true, createdAt: true },
      }),
      db.auditLog.findMany({
        where: { targetUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, adminEmail: true, action: true, details: true, reason: true, oldValue: true, newValue: true, createdAt: true },
      }),
      db.engageClientError.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, feature: true, code: true, message: true, extensionVersion: true, createdAt: true },
      }),
    ])

  const fromHistory = (rows: { kind: string; _count: { _all: number } }[]) => {
    const out: Partial<Record<EngageFeature, number>> = {}
    for (const r of rows) {
      const f = HISTORY_KIND_TO_FEATURE[r.kind]
      if (f) out[f] = (out[f] ?? 0) + r._count._all
    }
    return out
  }

  // Generations per day for the last 30 days, every day and every feature
  // (both extensions') present.
  const series = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(since30.getTime() + i * DAY).toISOString().slice(0, 10)
    return { date, ...Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, 0])) } as Record<string, number | string>
  })
  const index = new Map(series.map((p, i) => [p.date as string, i]))
  for (const h of daily) {
    const f = HISTORY_KIND_TO_FEATURE[h.kind]
    const i = index.get(h.createdAt.toISOString().slice(0, 10))
    if (f && i !== undefined) (series[i][f] as number) += 1
  }

  const versionByToken = new Map(clients.map((c) => [c.tokenId, c]))

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.profile?.name ?? null,
      headline: user.profile?.headline ?? null,
      createdAt: user.createdAt,
      accountSuspendedAt: user.suspendedAt,
      deletedAt: user.deletedAt,
    },
    access,
    control: user.engageControl,
    subscription: user.extensionSubscription,
    usage: {
      // Counted at the moment each generation is allowed (lib/engage/usage.ts):
      // starts when this version deployed.
      counters,
      // From history: every generation the user kept, since the beginning.
      historyToday: fromHistory(historyDay),
      historyMonth: fromHistory(historyMonth),
      series,
    },
    grants: grants.map((g) => ({ ...g, state: grantState(g, now) })),
    sessions: tokens.map((t) => ({
      ...t,
      extensionVersion: versionByToken.get(t.id)?.extensionVersion ?? null,
      versionSeenAt: versionByToken.get(t.id)?.lastSeenAt ?? null,
    })),
    notes,
    tags: tags.map((t) => t.tag),
    activity: {
      generations: recent,
      admin: audit,
    },
    errors,
    // This month's AI cost (admin → Engage → AI), null before it's recorded.
    aiMonth: await userAiCost(userId, monthStart, (await loadGlobalSettings()).aiPrices),
  }
}

export type EngageUserDetail = NonNullable<Awaited<ReturnType<typeof engageUserDetail>>>
