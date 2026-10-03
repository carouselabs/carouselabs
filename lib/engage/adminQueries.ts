// lib/engage/adminQueries.ts — the Engage admin's reads that span many
// users: the users table and the overview. Filtering, sorting and paging
// happen in one SQL query that returns just one page of ids, so the admin
// never downloads the whole user base; details are then loaded for that page
// only. Every value is a bound parameter (Prisma.sql); ORDER BY comes from a
// fixed list.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ENGAGE_FEATURES, HISTORY_KIND_TO_FEATURE, PLAN_FREE_GENERATIONS, type EngageFeature } from "@/lib/engage/features"
import { grantState } from "@/lib/engage/grants"

// ── Shared SQL fragments ────────────────────────────────────────────────
// u = "User". An Engage user is anyone who ever signed in to the extension,
// generated with it, subscribed to it, or was given access to it.
const ENGAGE_USER = Prisma.sql`(
  EXISTS (SELECT 1 FROM "ExtensionToken" t WHERE t."userId" = u.id)
  OR EXISTS (SELECT 1 FROM "CommentHistory" h WHERE h."userId" = u.id)
  OR EXISTS (SELECT 1 FROM "ExtensionSubscription" s WHERE s."userId" = u.id)
  OR EXISTS (SELECT 1 FROM "EngageAccessGrant" g WHERE g."userId" = u.id OR (g."userId" IS NULL AND g.email = lower(u.email)))
  OR EXISTS (SELECT 1 FROM "EngageUserControl" c WHERE c."userId" = u.id)
)`

const paidAt = (now: Date) => Prisma.sql`EXISTS (
  SELECT 1 FROM "ExtensionSubscription" s WHERE s."userId" = u.id
  AND (s.status IN ('active', 'on_trial', 'past_due') OR (s.status = 'cancelled' AND s."endsAt" > ${now}))
)`

const grantedAt = (now: Date) => Prisma.sql`EXISTS (
  SELECT 1 FROM "EngageAccessGrant" g
  WHERE (g."userId" = u.id OR (g."userId" IS NULL AND g.email = lower(u.email)))
  AND g."revokedAt" IS NULL AND g."startsAt" <= ${now} AND (g."endsAt" IS NULL OR g."endsAt" > ${now})
)`

const SUSPENDED = Prisma.sql`(u."suspendedAt" IS NOT NULL OR EXISTS (
  SELECT 1 FROM "EngageUserControl" c WHERE c."userId" = u.id AND c."suspendedAt" IS NOT NULL
))`

const HAS_OVERRIDES = Prisma.sql`EXISTS (
  SELECT 1 FROM "EngageUserControl" c WHERE c."userId" = u.id
  AND (c.features <> '{}'::jsonb OR c.limits <> '{}'::jsonb OR c."freeGenerations" IS NOT NULL)
)`

const LAST_ACTIVE = Prisma.sql`(SELECT max(t."lastUsedAt") FROM "ExtensionToken" t WHERE t."userId" = u.id)`

const monthStartUtc = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

// ── Users table ─────────────────────────────────────────────────────────

export const USER_ACCESS_FILTERS = ["all", "paid", "granted", "free", "suspended", "overrides"] as const
export const USER_ACTIVITY_FILTERS = ["any", "today", "7d", "30d", "inactive30", "never"] as const
export const USER_SORTS = ["last_active", "newest", "oldest", "email", "usage_month"] as const

export interface UserListParams {
  q?: string
  access: (typeof USER_ACCESS_FILTERS)[number]
  activity: (typeof USER_ACTIVITY_FILTERS)[number]
  tag?: string
  sort: (typeof USER_SORTS)[number]
  page: number
  pageSize: number
}

export interface UserListRow {
  id: string
  email: string
  name: string | null
  createdAt: string
  lastActiveAt: string | null
  access: "paid" | "granted" | "free"
  status: "active" | "suspended" | "account_suspended"
  subscriptionStatus: string | null
  grantEndsAt: string | null
  grantLifetime: boolean
  freeUsed: number
  freeLimit: number
  hasOverrides: boolean
  monthByFeature: Partial<Record<EngageFeature, number>>
  monthTotal: number
  extensionVersion: string | null
  tags: string[]
}

export async function listEngageUsers(params: UserListParams, now: Date = new Date()) {
  const where: Prisma.Sql[] = [ENGAGE_USER, Prisma.sql`u."deletedAt" IS NULL`]
  const q = params.q?.trim()
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    where.push(Prisma.sql`(u.email ILIKE ${like} OR u.id = ${q}
      OR EXISTS (SELECT 1 FROM "Profile" p WHERE p."userId" = u.id AND p.name ILIKE ${like}))`)
  }
  if (params.access === "paid") where.push(paidAt(now))
  if (params.access === "granted") where.push(Prisma.sql`(${grantedAt(now)} AND NOT ${paidAt(now)})`)
  if (params.access === "free") where.push(Prisma.sql`(NOT ${paidAt(now)} AND NOT ${grantedAt(now)})`)
  if (params.access === "suspended") where.push(SUSPENDED)
  if (params.access === "overrides") where.push(HAS_OVERRIDES)

  const day = 86_400_000
  const since = {
    today: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
    "7d": new Date(now.getTime() - 7 * day),
    "30d": new Date(now.getTime() - 30 * day),
  }
  if (params.activity === "today" || params.activity === "7d" || params.activity === "30d") {
    where.push(Prisma.sql`${LAST_ACTIVE} >= ${since[params.activity]}`)
  }
  if (params.activity === "inactive30") where.push(Prisma.sql`${LAST_ACTIVE} < ${since["30d"]}`)
  if (params.activity === "never") where.push(Prisma.sql`${LAST_ACTIVE} IS NULL`)

  if (params.tag) {
    where.push(Prisma.sql`EXISTS (SELECT 1 FROM "AdminUserTag" at WHERE at."userId" = u.id AND at.tag = ${params.tag})`)
  }

  const monthStart = monthStartUtc(now)
  const usageMonth = Prisma.sql`(SELECT count(*) FROM "CommentHistory" h WHERE h."userId" = u.id AND h."createdAt" >= ${monthStart})`
  const orderBy = {
    last_active: Prisma.sql`${LAST_ACTIVE} DESC NULLS LAST, u."createdAt" DESC`,
    newest: Prisma.sql`u."createdAt" DESC`,
    oldest: Prisma.sql`u."createdAt" ASC`,
    // lower(): the same order whatever the database's collation.
    email: Prisma.sql`lower(u.email) ASC`,
    usage_month: Prisma.sql`${usageMonth} DESC, u."createdAt" DESC`,
  }[params.sort]

  const pageSize = Math.min(Math.max(params.pageSize, 1), 100)
  const offset = (Math.max(params.page, 1) - 1) * pageSize

  const rows = await db.$queryRaw<{ id: string; total: bigint }[]>(Prisma.sql`
    SELECT u.id, count(*) OVER () AS total
    FROM "User" u
    WHERE ${Prisma.join(where, " AND ")}
    ORDER BY ${orderBy}
    LIMIT ${pageSize} OFFSET ${offset}
  `)
  const total = rows.length > 0 ? Number(rows[0].total) : await countWhere(where)
  const ids = rows.map((r) => r.id)
  return { rows: await loadUserRows(ids, now), total, page: Math.max(params.page, 1), pageSize }
}

async function countWhere(where: Prisma.Sql[]): Promise<number> {
  const [{ count }] = await db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT count(*) AS count FROM "User" u WHERE ${Prisma.join(where, " AND ")}
  `)
  return Number(count)
}

// Everything the table shows for one page of users, in a fixed number of
// queries whatever the page size.
async function loadUserRows(ids: string[], now: Date): Promise<UserListRow[]> {
  if (ids.length === 0) return []
  const monthStart = monthStartUtc(now)
  const [users, tokens, clients, history] = await Promise.all([
    db.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        email: true,
        createdAt: true,
        suspendedAt: true,
        extensionTrialUsed: true,
        profile: { select: { name: true } },
        engageControl: { select: { suspendedAt: true, features: true, limits: true, freeGenerations: true } },
        extensionSubscription: { select: { status: true, endsAt: true } },
        engageGrants: {
          where: { revokedAt: null },
          select: { startsAt: true, endsAt: true, revokedAt: true },
        },
        adminTags: { select: { tag: true }, orderBy: { tag: "asc" } },
      },
    }),
    db.extensionToken.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { lastUsedAt: true } }),
    db.engageClientInfo.findMany({
      where: { userId: { in: ids } },
      orderBy: { lastSeenAt: "desc" },
      select: { userId: true, extensionVersion: true },
    }),
    db.commentHistory.groupBy({
      by: ["userId", "kind"],
      where: { userId: { in: ids }, createdAt: { gte: monthStart } },
      _count: { _all: true },
    }),
  ])

  const lastActive = new Map(tokens.map((t) => [t.userId, t._max.lastUsedAt]))
  const version = new Map<string, string>()
  for (const c of clients) if (!version.has(c.userId)) version.set(c.userId, c.extensionVersion)

  const byId = new Map(users.map((u) => [u.id, u]))
  return ids.flatMap((id) => {
    const u = byId.get(id)
    if (!u) return []
    const sub = u.extensionSubscription
    const paid =
      !!sub &&
      (["active", "on_trial", "past_due"].includes(sub.status) ||
        (sub.status === "cancelled" && !!sub.endsAt && sub.endsAt > now))
    const activeGrants = u.engageGrants.filter((g) => grantState(g, now) === "active")
    const lifetime = activeGrants.some((g) => g.endsAt === null)
    const latestEnd = activeGrants.reduce<Date | null>(
      (max, g) => (g.endsAt && (!max || g.endsAt > max) ? g.endsAt : max),
      null,
    )
    const monthByFeature: Partial<Record<EngageFeature, number>> = {}
    let monthTotal = 0
    for (const h of history) {
      if (h.userId !== id) continue
      const feature = HISTORY_KIND_TO_FEATURE[h.kind]
      if (!feature) continue
      monthByFeature[feature] = (monthByFeature[feature] ?? 0) + h._count._all
      monthTotal += h._count._all
    }
    const control = u.engageControl
    const hasOverrides =
      !!control &&
      (JSON.stringify(control.features) !== "{}" ||
        JSON.stringify(control.limits) !== "{}" ||
        control.freeGenerations !== null)
    const freeLimit = control?.freeGenerations ?? PLAN_FREE_GENERATIONS
    return [
      {
        id: u.id,
        email: u.email,
        name: u.profile?.name ?? null,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: lastActive.get(id)?.toISOString() ?? null,
        access: paid ? "paid" : activeGrants.length > 0 ? "granted" : "free",
        status: u.suspendedAt ? "account_suspended" : control?.suspendedAt ? "suspended" : "active",
        subscriptionStatus: sub?.status ?? null,
        grantEndsAt: lifetime ? null : (latestEnd?.toISOString() ?? null),
        grantLifetime: lifetime,
        freeUsed: Math.min(u.extensionTrialUsed, freeLimit),
        freeLimit,
        hasOverrides,
        monthByFeature,
        monthTotal,
        extensionVersion: version.get(id) ?? null,
        tags: u.adminTags.map((t) => t.tag),
      } satisfies UserListRow,
    ]
  })
}

// ── Overview ────────────────────────────────────────────────────────────

export interface OverviewSeriesPoint {
  date: string // YYYY-MM-DD (UTC)
  comments: number
  replies: number
  connection_notes: number
  messages: number
  x_replies: number
  x_messages: number
  activeUsers: number
  newUsers: number
}

export async function engageOverview(from: Date, to: Date, now: Date = new Date()) {
  const [population] = await db.$queryRaw<
    { total: bigint; paid: bigint; granted: bigint; suspended: bigint }[]
  >(Prisma.sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE ${paidAt(now)}) AS paid,
      count(*) FILTER (WHERE ${grantedAt(now)} AND NOT ${paidAt(now)}) AS granted,
      count(*) FILTER (WHERE ${SUSPENDED}) AS suspended
    FROM "User" u
    WHERE ${ENGAGE_USER} AND u."deletedAt" IS NULL
  `)

  const [pendingGrants, byKind, actions, activeUsers, newUsers, errors, series] = await Promise.all([
    db.engageAccessGrant.count({
      where: { userId: null, revokedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    }),
    db.commentHistory.groupBy({ by: ["kind"], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
    db.commentHistory.groupBy({ by: ["action"], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
    db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(DISTINCT "userId") AS count FROM "CommentHistory" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
    `),
    db.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT count(*) AS count FROM (
        SELECT "userId", min("createdAt") AS first FROM "ExtensionToken" GROUP BY "userId"
      ) f WHERE f.first >= ${from} AND f.first < ${to}
    `),
    db.engageClientError.count({ where: { createdAt: { gte: from, lt: to } } }).catch(() => null),
    db.$queryRaw<
      { day: string; kind: string; generations: bigint; users: bigint }[]
    >(Prisma.sql`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, kind,
             count(*) AS generations, count(DISTINCT "userId") AS users
      FROM "CommentHistory"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1, 2
    `),
  ])

  const newPerDay = await db.$queryRaw<{ day: string; count: bigint }[]>(Prisma.sql`
    SELECT to_char(date_trunc('day', f.first), 'YYYY-MM-DD') AS day, count(*) AS count FROM (
      SELECT "userId", min("createdAt") AS first FROM "ExtensionToken" GROUP BY "userId"
    ) f WHERE f.first >= ${from} AND f.first < ${to} GROUP BY 1
  `)
  const activePerDay = await db.$queryRaw<{ day: string; count: bigint }[]>(Prisma.sql`
    SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, count(DISTINCT "userId") AS count
    FROM "CommentHistory" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1
  `)

  // One point per UTC day in the range, zeros included, so charts never skip
  // days. Timestamps are stored as UTC with no zone, so date_trunc cuts at UTC
  // midnight; the day comes back as text so no driver can shift it.
  const points = new Map<string, OverviewSeriesPoint>()
  for (let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()); t < to.getTime(); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    points.set(date, { date, comments: 0, replies: 0, connection_notes: 0, messages: 0, x_replies: 0, x_messages: 0, activeUsers: 0, newUsers: 0 })
  }
  for (const row of series) {
    const feature = HISTORY_KIND_TO_FEATURE[row.kind]
    const point = points.get(row.day)
    if (feature && point) point[feature] += Number(row.generations)
  }
  for (const row of activePerDay) {
    const point = points.get(row.day)
    if (point) point.activeUsers = Number(row.count)
  }
  for (const row of newPerDay) {
    const point = points.get(row.day)
    if (point) point.newUsers = Number(row.count)
  }

  const generations = Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, 0])) as Record<EngageFeature, number>
  for (const row of byKind) {
    const feature = HISTORY_KIND_TO_FEATURE[row.kind]
    if (feature) generations[feature] += row._count._all
  }
  const actionCount = (a: string) => actions.find((r) => r.action === a)?._count._all ?? 0
  const total = Number(population.total)
  const paid = Number(population.paid)
  const granted = Number(population.granted)

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    users: {
      total,
      paid,
      granted,
      free: Math.max(0, total - paid - granted),
      suspended: Number(population.suspended),
      pendingGrants,
      active: Number(activeUsers[0]?.count ?? 0),
      new: Number(newUsers[0]?.count ?? 0),
    },
    generations: { ...generations, total: Object.values(generations).reduce((a, b) => a + b, 0) },
    actions: { copied: actionCount("COPIED"), inserted: actionCount("INSERTED"), none: actionCount("NONE") },
    // null: the table isn't there yet. Reports start with extension 1.3.0.
    clientErrors: errors,
    series: [...points.values()],
  }
}
