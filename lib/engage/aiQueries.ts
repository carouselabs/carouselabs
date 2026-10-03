// lib/engage/aiQueries.ts — AI usage and cost for admin → Engage → AI, from
// the AI calls the extensions recorded (EngageAiCall, lib/engage/aiUsage.ts).
// Counts are worked out in SQL; cost is tokens × the prices set per model
// (lib/ai/models.ts), so changing a price changes past figures too. Tokens of
// a model with no price set are counted but cost nothing until it's set.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { callCost, type ModelPrice } from "@/lib/ai/models"
import { ENGAGE_FEATURES, X_FEATURES, type EngageFeature } from "@/lib/engage/features"
import type { OverviewPlatform } from "@/lib/engage/adminQueries"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

export interface AiFeatureRow {
  feature: EngageFeature
  model: string
  calls: number
  ok: number
  // Calls made by the backup model.
  fallback: number
  // Error or timeout.
  failed: number
  // Refused or answered nothing.
  refused: number
  inputTokens: number
  outputTokens: number
  cost: number | null
  avgMs: number
  p95Ms: number
  avgFirstTokenMs: number | null
}

export interface AiDayRow {
  date: string
  calls: number
  inputTokens: number
  outputTokens: number
  cost: number
}

export interface AiUserRow {
  userId: string
  email: string | null
  calls: number
  inputTokens: number
  outputTokens: number
  cost: number
}

export interface AiUsage {
  // false until scripts/engage-admin-phase-c.sql has run.
  recording: boolean
  totals: {
    calls: number
    ok: number
    fallback: number
    failed: number
    inputTokens: number
    outputTokens: number
    cost: number
    // Tokens of models with no price set (so not in `cost`).
    unpricedModels: string[]
    avgMs: number
  }
  byFeature: AiFeatureRow[]
  series: AiDayRow[]
  topUsers: AiUserRow[]
}

function featureFilter(platform: OverviewPlatform): Prisma.Sql {
  if (platform === "all") return Prisma.empty
  const x = Prisma.join(X_FEATURES)
  return platform === "x" ? Prisma.sql`AND c.feature IN (${x})` : Prisma.sql`AND c.feature NOT IN (${x})`
}

// tokens × price per model, in SQL, for ordering users by what they cost.
function costSql(prices: Record<string, ModelPrice>): Prisma.Sql {
  const entries = Object.entries(prices)
  if (entries.length === 0) return Prisma.sql`0`
  const cases = entries.map(
    ([model, p]) =>
      Prisma.sql`WHEN c.model = ${model} THEN coalesce(c."inputTokens", 0) * ${p.input}::float8 + coalesce(c."outputTokens", 0) * ${p.output}::float8`,
  )
  return Prisma.sql`sum(CASE ${Prisma.join(cases, " ")} ELSE 0 END) / 1000000.0`
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

export async function aiUsage(
  from: Date,
  to: Date,
  platform: OverviewPlatform,
  prices: Record<string, ModelPrice>,
): Promise<AiUsage> {
  const where = Prisma.sql`c."createdAt" >= ${from} AND c."createdAt" < ${to} ${featureFilter(platform)}`
  let byModel: Array<Record<string, unknown>>
  let perDay: Array<Record<string, unknown>>
  let perUser: Array<Record<string, unknown>>
  try {
    ;[byModel, perDay, perUser] = await Promise.all([
      db.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT c.feature, c.model, count(*) AS calls,
               count(*) FILTER (WHERE c.outcome = 'ok') AS ok,
               count(*) FILTER (WHERE c.fallback) AS fallback,
               count(*) FILTER (WHERE c.outcome IN ('error', 'timeout')) AS failed,
               count(*) FILTER (WHERE c.outcome IN ('refused', 'empty')) AS refused,
               coalesce(sum(c."inputTokens"), 0) AS "inputTokens",
               coalesce(sum(c."outputTokens"), 0) AS "outputTokens",
               avg(c.ms) AS "avgMs",
               percentile_cont(0.95) WITHIN GROUP (ORDER BY c.ms) AS "p95Ms",
               avg(c."firstTokenMs") AS "avgFirstTokenMs"
        FROM "EngageAiCall" c WHERE ${where}
        GROUP BY 1, 2
      `),
      db.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT to_char(date_trunc('day', c."createdAt"), 'YYYY-MM-DD') AS day, c.model, count(*) AS calls,
               coalesce(sum(c."inputTokens"), 0) AS "inputTokens", coalesce(sum(c."outputTokens"), 0) AS "outputTokens"
        FROM "EngageAiCall" c WHERE ${where}
        GROUP BY 1, 2
      `),
      db.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT c."userId", u.email, count(*) AS calls,
               coalesce(sum(c."inputTokens"), 0) AS "inputTokens", coalesce(sum(c."outputTokens"), 0) AS "outputTokens",
               ${costSql(prices)} AS cost
        FROM "EngageAiCall" c LEFT JOIN "User" u ON u.id = c."userId"
        WHERE ${where} AND c."userId" IS NOT NULL
        GROUP BY 1, 2
        ORDER BY cost DESC, (coalesce(sum(c."inputTokens"), 0) + coalesce(sum(c."outputTokens"), 0)) DESC
        LIMIT 20
      `),
    ])
  } catch (err) {
    // Before scripts/engage-admin-phase-c.sql: nothing recorded yet. (A raw
    // query reports a missing table in Postgres's own words, not as P2021.)
    if (!isEngageSchemaMissing(err) && !/relation "EngageAiCall" does not exist/.test(String(err))) throw err
    return emptyUsage(from, to)
  }

  const byFeature: AiFeatureRow[] = byModel
    .map((r) => {
      const input = num(r.inputTokens)
      const output = num(r.outputTokens)
      return {
        feature: r.feature as EngageFeature,
        model: String(r.model),
        calls: num(r.calls),
        ok: num(r.ok),
        fallback: num(r.fallback),
        failed: num(r.failed),
        refused: num(r.refused),
        inputTokens: input,
        outputTokens: output,
        cost: callCost(prices[String(r.model)], input, output),
        avgMs: Math.round(num(r.avgMs)),
        p95Ms: Math.round(num(r.p95Ms)),
        avgFirstTokenMs: r.avgFirstTokenMs === null || r.avgFirstTokenMs === undefined ? null : Math.round(num(r.avgFirstTokenMs)),
      }
    })
    .sort((a, b) => ENGAGE_FEATURES.indexOf(a.feature) - ENGAGE_FEATURES.indexOf(b.feature) || b.calls - a.calls)

  const days = new Map<string, AiDayRow>()
  for (let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()); t < to.getTime(); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    days.set(date, { date, calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  }
  for (const r of perDay) {
    const day = days.get(String(r.day))
    if (!day) continue
    const input = num(r.inputTokens)
    const output = num(r.outputTokens)
    day.calls += num(r.calls)
    day.inputTokens += input
    day.outputTokens += output
    day.cost += callCost(prices[String(r.model)], input, output) ?? 0
  }

  const calls = byFeature.reduce((n, r) => n + r.calls, 0)
  return {
    recording: true,
    totals: {
      calls,
      ok: byFeature.reduce((n, r) => n + r.ok, 0),
      fallback: byFeature.reduce((n, r) => n + r.fallback, 0),
      failed: byFeature.reduce((n, r) => n + r.failed, 0),
      inputTokens: byFeature.reduce((n, r) => n + r.inputTokens, 0),
      outputTokens: byFeature.reduce((n, r) => n + r.outputTokens, 0),
      cost: byFeature.reduce((n, r) => n + (r.cost ?? 0), 0),
      unpricedModels: [...new Set(byFeature.filter((r) => r.cost === null && r.inputTokens + r.outputTokens > 0).map((r) => r.model))],
      avgMs: calls === 0 ? 0 : Math.round(byFeature.reduce((n, r) => n + r.avgMs * r.calls, 0) / calls),
    },
    byFeature,
    series: [...days.values()],
    topUsers: perUser.map((r) => ({
      userId: String(r.userId),
      email: r.email === null || r.email === undefined ? null : String(r.email),
      calls: num(r.calls),
      inputTokens: num(r.inputTokens),
      outputTokens: num(r.outputTokens),
      cost: num(r.cost),
    })),
  }
}

function emptyUsage(from: Date, to: Date): AiUsage {
  const series: AiDayRow[] = []
  for (let t = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()); t < to.getTime(); t += 86_400_000) {
    series.push({ date: new Date(t).toISOString().slice(0, 10), calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 })
  }
  return {
    recording: false,
    totals: { calls: 0, ok: 0, fallback: 0, failed: 0, inputTokens: 0, outputTokens: 0, cost: 0, unpricedModels: [], avgMs: 0 },
    byFeature: [],
    series,
    topUsers: [],
  }
}

// Every user's AI calls, tokens and cost in a range, most expensive first,
// for the CSV export (the page shows the top 20). Empty before the table exists.
export async function aiCostByUser(
  from: Date,
  to: Date,
  platform: OverviewPlatform,
  prices: Record<string, ModelPrice>,
  limit = 10_000,
): Promise<AiUserRow[]> {
  const where = Prisma.sql`c."createdAt" >= ${from} AND c."createdAt" < ${to} ${featureFilter(platform)}`
  try {
    const rows = await db.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT c."userId", u.email, count(*) AS calls,
             coalesce(sum(c."inputTokens"), 0) AS "inputTokens", coalesce(sum(c."outputTokens"), 0) AS "outputTokens",
             ${costSql(prices)} AS cost
      FROM "EngageAiCall" c LEFT JOIN "User" u ON u.id = c."userId"
      WHERE ${where} AND c."userId" IS NOT NULL
      GROUP BY 1, 2
      ORDER BY cost DESC, (coalesce(sum(c."inputTokens"), 0) + coalesce(sum(c."outputTokens"), 0)) DESC
      LIMIT ${limit}
    `)
    return rows.map((r) => ({
      userId: String(r.userId),
      email: r.email === null || r.email === undefined ? null : String(r.email),
      calls: num(r.calls),
      inputTokens: num(r.inputTokens),
      outputTokens: num(r.outputTokens),
      cost: num(r.cost),
    }))
  } catch (err) {
    if (isEngageSchemaMissing(err) || /relation "EngageAiCall" does not exist/.test(String(err))) return []
    throw err
  }
}

// One user's AI cost from a date on (their admin page), or null before the
// table exists.
export async function userAiCost(
  userId: string,
  since: Date,
  prices: Record<string, ModelPrice>,
): Promise<{ calls: number; cost: number; unpriced: boolean } | null> {
  try {
    const rows = await db.engageAiCall.groupBy({
      by: ["model"],
      where: { userId, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    })
    let cost = 0
    let unpriced = false
    for (const r of rows) {
      const c = callCost(prices[r.model], r._sum.inputTokens ?? 0, r._sum.outputTokens ?? 0)
      if (c === null) unpriced ||= (r._sum.inputTokens ?? 0) + (r._sum.outputTokens ?? 0) > 0
      else cost += c
    }
    return { calls: rows.reduce((n, r) => n + r._count._all, 0), cost, unpriced }
  } catch (err) {
    if (isEngageSchemaMissing(err)) return null
    throw err
  }
}
