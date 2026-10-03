// lib/engage/errorQueries.ts — what's failing, for admin → Engage → Errors:
// errors the extensions report (EngageClientError: Insert couldn't find the
// box, a chat couldn't be read…; codes only, never page text) and AI calls
// that failed or timed out (EngageAiCall). Grouped, with how many people each
// hit and on which versions, plus the latest ones with who they happened to.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { modelLabel } from "@/lib/ai/models"
import { X_FEATURES } from "@/lib/engage/features"
import { compareVersions } from "@/lib/engage/settingsRules"
import type { OverviewPlatform } from "@/lib/engage/adminQueries"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

export interface ExtensionErrorGroup {
  feature: string
  code: string
  message: string
  count: number
  people: number
  versions: string[]
  lastAt: string
}

export interface AiFailureGroup {
  feature: string
  model: string
  outcome: "error" | "timeout"
  count: number
  people: number
  lastAt: string
}

export interface RecentError {
  id: string
  at: string
  userId: string | null
  email: string | null
  feature: string
  // The error code, or the AI model and how it failed ("GPT Luna timed out").
  what: string
  version: string | null
}

export interface EngageErrors {
  extension: { recording: boolean; total: number; groups: ExtensionErrorGroup[]; recent: RecentError[] }
  ai: { recording: boolean; total: number; groups: AiFailureGroup[]; recent: RecentError[] }
  people: number
  series: Array<{ date: string; extension: number; ai: number }>
}

// An error's feature says which extension it came from; generic ones
// (insert, read, auth, other) are the LinkedIn extension's.
function platformSql(platform: OverviewPlatform, column: Prisma.Sql): Prisma.Sql {
  if (platform === "all") return Prisma.empty
  const x = Prisma.join(X_FEATURES)
  return platform === "x" ? Prisma.sql`AND ${column} IN (${x})` : Prisma.sql`AND ${column} NOT IN (${x})`
}

const missingTable = (err: unknown, table: string) =>
  isEngageSchemaMissing(err) || new RegExp(`relation "${table}" does not exist`).test(String(err))

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))
const iso = (v: unknown) => new Date(v as string | Date).toISOString()

async function orMissing<T>(table: string, run: () => Promise<T>, empty: T): Promise<{ ok: boolean; value: T }> {
  try {
    return { ok: true, value: await run() }
  } catch (err) {
    if (missingTable(err, table)) return { ok: false, value: empty }
    throw err
  }
}

export async function engageErrors(from: Date, to: Date, platform: OverviewPlatform): Promise<EngageErrors> {
  const extWhere = Prisma.sql`e."createdAt" >= ${from} AND e."createdAt" < ${to} ${platformSql(platform, Prisma.sql`e.feature`)}`
  const aiWhere = Prisma.sql`c."createdAt" >= ${from} AND c."createdAt" < ${to} AND c.outcome IN ('error', 'timeout') ${platformSql(platform, Prisma.sql`c.feature`)}`
  type Rows = Array<Record<string, unknown>>

  const [ext, ai] = await Promise.all([
    orMissing<[Rows, Rows, Rows, Rows]>(
      "EngageClientError",
      () =>
        Promise.all([
          db.$queryRaw<Rows>(Prisma.sql`
            SELECT e.feature, e.code, min(e.message) AS message, count(*) AS count, count(DISTINCT e."userId") AS people,
                   array_remove(array_agg(DISTINCT e."extensionVersion"), NULL) AS versions, max(e."createdAt") AS "lastAt"
            FROM "EngageClientError" e WHERE ${extWhere}
            GROUP BY 1, 2 ORDER BY count DESC, "lastAt" DESC LIMIT 50
          `),
          db.$queryRaw<Rows>(Prisma.sql`
            SELECT e.id, e."createdAt" AS at, e."userId", u.email, e.feature, e.code AS what, e."extensionVersion" AS version
            FROM "EngageClientError" e LEFT JOIN "User" u ON u.id = e."userId" WHERE ${extWhere}
            ORDER BY e."createdAt" DESC LIMIT 30
          `),
          db.$queryRaw<Rows>(Prisma.sql`
            SELECT to_char(date_trunc('day', e."createdAt"), 'YYYY-MM-DD') AS day, count(*) AS count
            FROM "EngageClientError" e WHERE ${extWhere} GROUP BY 1
          `),
          db.$queryRaw<Rows>(Prisma.sql`SELECT DISTINCT e."userId" FROM "EngageClientError" e WHERE ${extWhere} AND e."userId" IS NOT NULL`),
        ]),
      [[], [], [], []],
    ),
    orMissing<[Rows, Rows, Rows, Rows]>(
      "EngageAiCall",
      () =>
        Promise.all([
          db.$queryRaw<Rows>(Prisma.sql`
            SELECT c.feature, c.model, c.outcome, count(*) AS count, count(DISTINCT c."userId") AS people, max(c."createdAt") AS "lastAt"
            FROM "EngageAiCall" c WHERE ${aiWhere}
            GROUP BY 1, 2, 3 ORDER BY count DESC, "lastAt" DESC LIMIT 50
          `),
          db.$queryRaw<Rows>(Prisma.sql`
            SELECT c.id, c."createdAt" AS at, c."userId", u.email, c.feature, c.model, c.outcome, NULL AS version
            FROM "EngageAiCall" c LEFT JOIN "User" u ON u.id = c."userId" WHERE ${aiWhere}
            ORDER BY c."createdAt" DESC LIMIT 30
          `),
          db.$queryRaw<Rows>(Prisma.sql`
            SELECT to_char(date_trunc('day', c."createdAt"), 'YYYY-MM-DD') AS day, count(*) AS count
            FROM "EngageAiCall" c WHERE ${aiWhere} GROUP BY 1
          `),
          db.$queryRaw<Rows>(Prisma.sql`SELECT DISTINCT c."userId" FROM "EngageAiCall" c WHERE ${aiWhere} AND c."userId" IS NOT NULL`),
        ]),
      [[], [], [], []],
    ),
  ])

  const [extGroups, extRecent, extDays, extUsers] = ext.value
  const [aiGroups, aiRecent, aiDays, aiUsers] = ai.value
  const recent = (rows: Rows): RecentError[] =>
    rows.map((r) => ({
      id: String(r.id),
      at: iso(r.at),
      userId: r.userId === null || r.userId === undefined ? null : String(r.userId),
      email: r.email === null || r.email === undefined ? null : String(r.email),
      feature: String(r.feature),
      what: r.model !== undefined ? `${modelLabel(String(r.model))} ${r.outcome === "timeout" ? "timed out" : "failed"}` : String(r.what),
      version: r.version === null || r.version === undefined ? null : String(r.version),
    }))

  const series = new Map<string, { date: string; extension: number; ai: number }>()
  for (let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()); t < to.getTime(); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    series.set(date, { date, extension: 0, ai: 0 })
  }
  for (const r of extDays) {
    const d = series.get(String(r.day))
    if (d) d.extension += n(r.count)
  }
  for (const r of aiDays) {
    const d = series.get(String(r.day))
    if (d) d.ai += n(r.count)
  }

  const extensionGroups: ExtensionErrorGroup[] = extGroups.map((r) => ({
    feature: String(r.feature),
    code: String(r.code),
    message: String(r.message ?? ""),
    count: n(r.count),
    people: n(r.people),
    versions: Array.isArray(r.versions) ? (r.versions as unknown[]).map(String).sort(compareVersions) : [],
    lastAt: iso(r.lastAt),
  }))
  const aiFailureGroups: AiFailureGroup[] = aiGroups.map((r) => ({
    feature: String(r.feature),
    model: String(r.model),
    outcome: r.outcome === "timeout" ? "timeout" : "error",
    count: n(r.count),
    people: n(r.people),
    lastAt: iso(r.lastAt),
  }))

  const days = [...series.values()]
  return {
    extension: {
      recording: ext.ok,
      total: days.reduce((s, d) => s + d.extension, 0),
      groups: extensionGroups,
      recent: recent(extRecent),
    },
    ai: { recording: ai.ok, total: days.reduce((s, d) => s + d.ai, 0), groups: aiFailureGroups, recent: recent(aiRecent) },
    people: new Set([...extUsers, ...aiUsers].map((r) => String(r.userId))).size,
    series: days,
  }
}
