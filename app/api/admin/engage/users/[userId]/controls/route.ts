// PATCH /api/admin/engage/users/[userId]/controls — this user's feature
// switches, limits and free generations, on top of the plan.
// body: { features?, limits?, freeGenerations?, reason? }
//   features         { comments: "on" | "off" | "default", ... }
//   limits           { "comments.month": 500 | "unlimited" | "default", dailyCap: ..., ... }
//   freeGenerations  number | null (null = plan default)
// "default" removes an override. Only the keys sent change.
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { parseFeatureOverrides, parseLimitOverrides } from "@/lib/engage/accessRules"
import { ENGAGE_FEATURES, LIMIT_KEYS, type LimitKey } from "@/lib/engage/features"
import { logAdminAction, getRequestIp, type AdminAuditAction } from "@/lib/auditLog"

const limitKey = z.enum(LIMIT_KEYS as [LimitKey, ...LimitKey[]])
const body = z
  .object({
    features: z.partialRecord(z.enum(ENGAGE_FEATURES), z.enum(["on", "off", "default"])).optional(),
    limits: z
      .partialRecord(limitKey, z.union([z.literal("unlimited"), z.literal("default"), z.number().int().min(0).max(1_000_000)]))
      .optional(),
    freeGenerations: z.number().int().min(0).max(100_000).nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((b) => b.features || b.limits || b.freeGenerations !== undefined, { message: "Nothing to change" })

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const change = parsed.data

  const current = await db.engageUserControl.findUnique({ where: { userId } })
  const oldFeatures = parseFeatureOverrides(current?.features)
  const oldLimits = parseLimitOverrides(current?.limits)

  const features: Record<string, string> = { ...oldFeatures }
  for (const [k, v] of Object.entries(change.features ?? {})) {
    if (v === "default") delete features[k]
    else features[k] = v
  }
  const limits: Record<string, number | "unlimited"> = { ...oldLimits }
  for (const [k, v] of Object.entries(change.limits ?? {})) {
    if (v === "default") delete limits[k]
    else limits[k] = v
  }
  const freeGenerations =
    change.freeGenerations === undefined ? (current?.freeGenerations ?? null) : change.freeGenerations

  await db.engageUserControl.upsert({
    where: { userId },
    create: { userId, features, limits, freeGenerations, updatedBy: gate.admin.email },
    update: { features, limits, freeGenerations, updatedBy: gate.admin.email },
  })

  // One audit row per kind of change, each with its own before/after.
  const entries: { action: AdminAuditAction; details: string; oldValue: object | number | null; newValue: object | number | null }[] = []
  if (change.features) {
    entries.push({ action: "ENGAGE_UPDATE_FEATURES", details: "Changed Engage feature access", oldValue: oldFeatures, newValue: features })
  }
  if (change.limits) {
    entries.push({ action: "ENGAGE_UPDATE_LIMITS", details: "Changed Engage limits", oldValue: oldLimits, newValue: limits })
  }
  if (change.freeGenerations !== undefined) {
    entries.push({
      action: "ENGAGE_SET_FREE_GENERATIONS",
      details: `Free generations: ${freeGenerations ?? "plan default"}`,
      oldValue: current?.freeGenerations ?? null,
      newValue: freeGenerations,
    })
  }
  const ip = getRequestIp(req)
  for (const e of entries) {
    await logAdminAction({
      adminEmail: gate.admin.email,
      action: e.action,
      product: "engage",
      targetUserId: userId,
      targetEmail: user.email,
      details: e.details,
      oldValue: e.oldValue,
      newValue: e.newValue,
      reason: change.reason || null,
      ipAddress: ip,
    })
  }

  return NextResponse.json({ ok: true, features, limits, freeGenerations })
}
