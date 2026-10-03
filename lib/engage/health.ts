// lib/engage/health.ts — is Engage working right now, for admin → Engage →
// Health: the database answering and how fast, which setup SQL has been run,
// the AI keys being set (yes / no only), each AI model's last hour, the last
// hour's generations and errors, and anything switched off in Controls.
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { AI_MODEL_KEYS, AI_MODELS, modelLabel } from "@/lib/ai/models"
import { FEATURE_LABELS, PLATFORM_LABELS, type EngageFeature, type EngagePlatform } from "@/lib/engage/features"
import { loadGlobalSettings } from "@/lib/engage/settings"

export type HealthStatus = "ok" | "warn" | "bad" | "idle"

export interface HealthCheck {
  id: string
  label: string
  status: HealthStatus
  detail: string
}

export interface EngageHealth {
  checkedAt: string
  overall: HealthStatus
  checks: HealthCheck[]
}

// The setup SQL, by a table each one creates.
const SETUP: { table: string; label: string; script: string }[] = [
  { table: "EngageUserControl", label: "Engage admin (access, grants, audit)", script: "scripts/engage-admin-schema.sql" },
  { table: "EngageSetting", label: "Controls (settings for everyone)", script: "scripts/engage-admin-phase-b.sql" },
  { table: "EngageAiCall", label: "AI usage and cost", script: "scripts/engage-admin-phase-c.sql" },
  { table: "XProfile", label: "CarouseLabs Engage for X", script: "scripts/x-extension-schema.sql" },
]

const HOUR = 3_600_000

// A model's last hour: no calls is idle; failing more than half is bad, more
// than a fifth worth a look.
export function aiStatus(calls: number, failed: number): HealthStatus {
  if (calls === 0) return "idle"
  const share = failed / calls
  return share > 0.5 ? "bad" : share > 0.2 ? "warn" : "ok"
}

export function dbStatus(ms: number): HealthStatus {
  return ms < 300 ? "ok" : ms < 1000 ? "warn" : "bad"
}

export function overallStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some((c) => c.status === "bad")) return "bad"
  if (checks.some((c) => c.status === "warn")) return "warn"
  return "ok"
}

async function count(sql: Prisma.Sql): Promise<number | null> {
  try {
    const [row] = await db.$queryRaw<{ count: bigint }[]>(sql)
    return Number(row?.count ?? 0)
  } catch {
    return null
  }
}

export async function engageHealth(now: Date = new Date()): Promise<EngageHealth> {
  const checks: HealthCheck[] = []
  const since = new Date(now.getTime() - HOUR)

  // Database.
  const start = performance.now()
  let dbUp = true
  try {
    await db.$queryRaw(Prisma.sql`SELECT 1`)
  } catch {
    dbUp = false
  }
  const dbMs = Math.round(performance.now() - start)
  checks.push(
    dbUp
      ? { id: "database", label: "Database", status: dbStatus(dbMs), detail: `Answered in ${dbMs} ms` }
      : { id: "database", label: "Database", status: "bad", detail: "Not answering" },
  )
  if (!dbUp) return { checkedAt: now.toISOString(), overall: "bad", checks }

  // Setup SQL.
  const tables = await db.$queryRaw<{ name: string; present: boolean }[]>(Prisma.sql`
    SELECT t.name, to_regclass('"' || t.name || '"') IS NOT NULL AS present
    FROM unnest(${SETUP.map((s) => s.table)}::text[]) AS t(name)
  `)
  const present = new Set(tables.filter((t) => t.present).map((t) => t.name))
  for (const s of SETUP) {
    checks.push({
      id: `setup:${s.table}`,
      label: `Setup: ${s.label}`,
      status: present.has(s.table) ? "ok" : "warn",
      detail: present.has(s.table) ? "Done" : `Run ${s.script} in Supabase`,
    })
  }

  // AI keys: whether they're set, never what they are.
  for (const [id, label, set] of [
    ["openai", "GPT Luna key (OpenAI)", !!process.env.OPENAI_API_KEY],
    ["anthropic", "Claude Haiku key (Anthropic)", !!process.env.ANTHROPIC_API_KEY],
  ] as const) {
    checks.push({ id: `key:${id}`, label: label, status: set ? "ok" : "bad", detail: set ? "Set" : "Missing on the server" })
  }

  // Each AI model's last hour.
  if (present.has("EngageAiCall")) {
    const rows = await db.$queryRaw<{ model: string; calls: bigint; failed: bigint; avgMs: number | null }[]>(Prisma.sql`
      SELECT model, count(*) AS calls, count(*) FILTER (WHERE outcome IN ('error', 'timeout')) AS failed, avg(ms) AS "avgMs"
      FROM "EngageAiCall" WHERE "createdAt" >= ${since} GROUP BY model
    `)
    const byModel = new Map(rows.map((r) => [r.model, r]))
    for (const key of AI_MODEL_KEYS) {
      const r = byModel.get(AI_MODELS[key].id)
      const calls = Number(r?.calls ?? 0)
      const failed = Number(r?.failed ?? 0)
      checks.push({
        id: `ai:${key}`,
        label: `${modelLabel(AI_MODELS[key].id)}, last hour`,
        status: aiStatus(calls, failed),
        detail:
          calls === 0
            ? "No calls"
            : `${calls} call${calls === 1 ? "" : "s"}, ${failed} failed, ${((Number(r?.avgMs ?? 0)) / 1000).toFixed(1)}s on average`,
      })
    }
  }

  // The last hour's activity.
  const [generations, extErrors] = await Promise.all([
    count(Prisma.sql`SELECT count(*) AS count FROM "CommentHistory" WHERE "createdAt" >= ${since}`),
    present.has("EngageUserControl")
      ? count(Prisma.sql`SELECT count(*) AS count FROM "EngageClientError" WHERE "createdAt" >= ${since}`)
      : Promise.resolve(null),
  ])
  checks.push({
    id: "generations",
    label: "Generations, last hour",
    status: generations === null ? "warn" : generations === 0 ? "idle" : "ok",
    detail: generations === null ? "Couldn't count" : `${generations}`,
  })
  if (extErrors !== null) {
    checks.push({
      id: "extension-errors",
      label: "Extension errors, last hour",
      status: extErrors >= 10 ? "warn" : "ok",
      detail: `${extErrors}`,
    })
  }

  // Anything switched off for everyone.
  const settings = await loadGlobalSettings()
  const paused = (Object.keys(settings.features) as EngageFeature[]).filter((f) => !settings.features[f].enabled)
  const insertOff = (Object.keys(settings.insert) as EngagePlatform[]).filter((p) => !settings.insert[p])
  const minimums = (Object.keys(settings.minVersion) as EngagePlatform[]).filter((p) => settings.minVersion[p])
  const off = [
    ...paused.map((f) => `${FEATURE_LABELS[f]} paused`),
    ...insertOff.map((p) => `Insert off in ${PLATFORM_LABELS[p]}`),
    ...minimums.map((p) => `${PLATFORM_LABELS[p]} minimum version ${settings.minVersion[p]}`),
  ]
  checks.push({
    id: "controls",
    label: "Controls",
    status: paused.length > 0 || insertOff.length > 0 ? "warn" : "ok",
    detail: off.length > 0 ? off.join(" · ") : "Everything on",
  })

  return { checkedAt: now.toISOString(), overall: overallStatus(checks), checks }
}
