// GET /api/admin/engage/export?type= — Engage data as a CSV download, each
// download recorded in the audit log (who, what, how many rows).
//   users     the users table with its current filters (q, access, activity,
//             platform, tag, sort), up to EXPORT_MAX rows
//   audit     the Engage audit trail (q = target email), newest first
//   ai-users  AI calls, tokens and cost per user (range, platform)
//   errors    errors the extensions reported (range, platform)
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import {
  listEngageUsers,
  USER_ACCESS_FILTERS,
  USER_ACTIVITY_FILTERS,
  USER_PLATFORM_FILTERS,
  USER_SORTS,
  type OverviewPlatform,
  type UserListRow,
} from "@/lib/engage/adminQueries"
import { aiCostByUser } from "@/lib/engage/aiQueries"
import { ENGAGE_FEATURES, FEATURE_LABELS, X_FEATURES } from "@/lib/engage/features"
import { resolveRange } from "@/lib/engage/ranges"
import { loadGlobalSettings } from "@/lib/engage/settings"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { csvResponse, toCsv } from "@/lib/engage/csv"
import { getRequestIp, logAdminAction } from "@/lib/auditLog"

// More than this many rows is a database job, not a download.
const EXPORT_MAX = 10_000

const usersQuery = z.object({
  q: z.string().max(200).optional(),
  access: z.enum(USER_ACCESS_FILTERS).default("all"),
  activity: z.enum(USER_ACTIVITY_FILTERS).default("any"),
  platform: z.enum(USER_PLATFORM_FILTERS).default("any"),
  tag: z.string().max(40).optional(),
  sort: z.enum(USER_SORTS).default("last_active"),
})

const today = () => new Date().toISOString().slice(0, 10)

async function usersCsv(params: z.infer<typeof usersQuery>): Promise<{ csv: string; rows: number }> {
  const all: UserListRow[] = []
  for (let page = 1; all.length < EXPORT_MAX; page += 1) {
    const res = await listEngageUsers({ ...params, tag: params.tag || undefined, page, pageSize: 100 })
    all.push(...res.rows)
    if (res.rows.length < 100 || all.length >= res.total) break
  }
  const header = [
    "User ID",
    "Email",
    "Name",
    "Access",
    "Status",
    "Extensions",
    "LinkedIn version",
    "X version",
    "Generated this month",
    ...ENGAGE_FEATURES.map((f) => `${FEATURE_LABELS[f]} this month`),
    "Free used",
    "Free limit",
    "Free access until",
    "Last active",
    "Joined",
    "Tags",
  ]
  const rows = all.map((u) => [
    u.id,
    u.email,
    u.name,
    u.access,
    u.status,
    u.extensions.join(" "),
    u.extensionVersion,
    u.xExtensionVersion,
    u.monthTotal,
    ...ENGAGE_FEATURES.map((f) => u.monthByFeature[f] ?? 0),
    u.freeUsed,
    u.freeLimit,
    u.grantLifetime ? "lifetime" : u.grantEndsAt,
    u.lastActiveAt,
    u.createdAt,
    u.tags.join("; "),
  ])
  return { csv: toCsv(header, rows), rows: rows.length }
}

async function auditCsv(q: string | undefined): Promise<{ csv: string; rows: number }> {
  const entries = await db.auditLog.findMany({
    where: { product: "engage", ...(q ? { targetEmail: { contains: q, mode: "insensitive" } } : {}) },
    orderBy: { createdAt: "desc" },
    take: EXPORT_MAX,
    select: { createdAt: true, adminEmail: true, action: true, targetEmail: true, details: true, reason: true, oldValue: true, newValue: true },
  })
  const rows = entries.map((e) => [
    e.createdAt,
    e.adminEmail,
    e.action,
    e.targetEmail,
    e.details,
    e.reason,
    e.oldValue === null ? "" : JSON.stringify(e.oldValue),
    e.newValue === null ? "" : JSON.stringify(e.newValue),
  ])
  return { csv: toCsv(["When", "Admin", "Action", "User", "What", "Reason", "Before", "After"], rows), rows: rows.length }
}

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.export")
  if (!gate.ok) return gate.response
  const params = Object.fromEntries(new URL(req.url).searchParams)
  const type = params.type

  let result: { csv: string; rows: number }
  let filename: string
  let what: string
  if (type === "users") {
    const parsed = usersQuery.safeParse(params)
    if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 })
    result = await usersCsv(parsed.data)
    filename = `engage-users-${today()}.csv`
    what = "Engage users"
  } else if (type === "audit") {
    result = await auditCsv(params.q?.trim().slice(0, 200) || undefined)
    filename = `engage-audit-${today()}.csv`
    what = "the Engage audit log"
  } else if (type === "ai-users" || type === "errors") {
    const range = resolveRange(params.range ?? null, params.from ?? null, params.to ?? null)
    if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    const p = params.platform ?? "all"
    if (p !== "all" && p !== "linkedin" && p !== "x") return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    const platform: OverviewPlatform = p
    if (type === "ai-users") {
      const prices = (await loadGlobalSettings()).aiPrices
      const users = await aiCostByUser(range.from, range.to, platform, prices, EXPORT_MAX)
      result = {
        csv: toCsv(
          ["User ID", "Email", "AI calls", "Tokens in", "Tokens out", "Cost ($)"],
          users.map((u) => [u.userId, u.email, u.calls, u.inputTokens, u.outputTokens, u.cost.toFixed(4)]),
        ),
        rows: users.length,
      }
      filename = `engage-ai-cost-${range.key}-${today()}.csv`
      what = "AI cost per user"
    } else {
      const featureFilter =
        platform === "x" ? { feature: { in: X_FEATURES } } : platform === "linkedin" ? { feature: { notIn: X_FEATURES } } : {}
      const errors = await db.engageClientError
        .findMany({
          where: { createdAt: { gte: range.from, lt: range.to }, ...featureFilter },
          orderBy: { createdAt: "desc" },
          take: EXPORT_MAX,
          select: { createdAt: true, feature: true, code: true, message: true, extensionVersion: true, user: { select: { email: true } } },
        })
        .catch((err) => {
          if (isEngageSchemaMissing(err)) return []
          throw err
        })
      result = {
        csv: toCsv(
          ["When", "User", "Feature", "Code", "Message", "Version"],
          errors.map((e) => [e.createdAt, e.user?.email ?? "", e.feature, e.code, e.message, e.extensionVersion]),
        ),
        rows: errors.length,
      }
      filename = `engage-errors-${range.key}-${today()}.csv`
      what = "extension errors"
    }
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 400 })
  }

  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_EXPORT",
    product: "engage",
    details: `Downloaded ${what} (${result.rows} row${result.rows === 1 ? "" : "s"})`,
    newValue: { type, rows: result.rows, filters: params },
    ipAddress: getRequestIp(req),
  })
  return csvResponse(filename, result.csv)
}
