// /api/admin/engage/controls — settings that apply to everyone using the
// extensions (lib/engage/settingsRules.ts), and the versions in use.
//
// GET    { ready, settings, saved: { key: { updatedAt, updatedBy } }, versions }
//        ready: false until scripts/engage-admin-phase-b.sql has run.
// PATCH  one change at a time, each written to the audit log:
//          { feature: { key, enabled, message? } }   pause or resume a feature for everyone
//          { insert: { platform, enabled } }         the Insert button, per extension
//          { minVersion: { platform, version } }     oldest version allowed to write; null = none
//        plus an optional reason. Takes effect within SETTINGS_CACHE_MS.
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { parseBody } from "@/lib/engage/adminApi"
import { ENGAGE_FEATURES, ENGAGE_PLATFORMS, FEATURE_LABELS, PLATFORM_LABELS } from "@/lib/engage/features"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { saveGlobalSetting } from "@/lib/engage/settings"
import {
  PAUSE_MESSAGE_MAX,
  VERSION_PATTERN,
  compareVersions,
  defaultGlobalSettings,
  globalSettingsFrom,
  type EngageGlobalSettings,
} from "@/lib/engage/settingsRules"
import { extensionVersions } from "@/lib/engage/versions"
import { getRequestIp, logAdminAction, type AdminAuditAction } from "@/lib/auditLog"

type Saved = Record<string, { updatedAt: string; updatedBy: string | null }>

// Read fresh (not the generation path's cache): the admin sees what is stored.
async function readSettings(): Promise<{ ready: boolean; settings: EngageGlobalSettings; saved: Saved }> {
  try {
    const rows = await db.engageSetting.findMany()
    return {
      ready: true,
      settings: globalSettingsFrom(rows),
      saved: Object.fromEntries(rows.map((r) => [r.key, { updatedAt: r.updatedAt.toISOString(), updatedBy: r.updatedBy }])),
    }
  } catch (err) {
    if (!isEngageSchemaMissing(err)) throw err
    return { ready: false, settings: defaultGlobalSettings(), saved: {} }
  }
}

async function state() {
  const [read, versions] = await Promise.all([readSettings(), extensionVersions()])
  return { ...read, versions }
}

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  return NextResponse.json(await state())
}

const reason = z.string().trim().max(500).optional()
const body = z.union([
  z.object({
    feature: z.object({
      key: z.enum(ENGAGE_FEATURES),
      enabled: z.boolean(),
      message: z.string().trim().max(PAUSE_MESSAGE_MAX).nullable().optional(),
    }),
    reason,
  }),
  z.object({ insert: z.object({ platform: z.enum(ENGAGE_PLATFORMS), enabled: z.boolean() }), reason }),
  z.object({
    minVersion: z.object({
      platform: z.enum(ENGAGE_PLATFORMS),
      version: z.string().trim().regex(VERSION_PATTERN, "Use a version like 1.3.0").nullable(),
    }),
    reason,
  }),
])

export async function PATCH(req: Request) {
  const gate = await requireEngagePermission(req, "engage.controls.manage")
  if (!gate.ok) return gate.response
  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const change = parsed.data

  const current = await readSettings()
  if (!current.ready) {
    return NextResponse.json(
      { error: "Run scripts/engage-admin-phase-b.sql in Supabase first, then try again." },
      { status: 409 },
    )
  }
  const { settings } = current

  let entry: { key: "features" | "insert" | "minVersion"; value: object; action: AdminAuditAction; details: string; oldValue: object; newValue: object }

  if ("feature" in change) {
    const { key, enabled } = change.feature
    const message = enabled ? null : change.feature.message?.trim() || null
    const before = settings.features[key]
    const after = { enabled, message }
    entry = {
      key: "features",
      value: { ...settings.features, [key]: after },
      action: enabled ? "ENGAGE_RESUME_FEATURE" : "ENGAGE_PAUSE_FEATURE",
      details: enabled
        ? `Turned ${FEATURE_LABELS[key]} back on for everyone`
        : `Paused ${FEATURE_LABELS[key]} for everyone${message ? `: "${message}"` : ""}`,
      oldValue: { [key]: before },
      newValue: { [key]: after },
    }
  } else if ("insert" in change) {
    const { platform, enabled } = change.insert
    entry = {
      key: "insert",
      value: { ...settings.insert, [platform]: enabled },
      action: "ENGAGE_SET_INSERT",
      details: `Insert ${enabled ? "on" : "off"} for everyone in the ${PLATFORM_LABELS[platform]} extension`,
      oldValue: { [platform]: settings.insert[platform] },
      newValue: { [platform]: enabled },
    }
  } else {
    const { platform, version } = change.minVersion
    if (version) {
      // Never a minimum nobody has: that would stop every browser at once.
      const versions = (await extensionVersions()).filter((v) => v.platform === platform && v.version)
      if (!versions.some((v) => compareVersions(v.version!, version) >= 0)) {
        return NextResponse.json(
          {
            error: `Nobody has ${PLATFORM_LABELS[platform]} ${version} or newer yet, so everyone would be asked to update. Wait until people have it.`,
          },
          { status: 400 },
        )
      }
    }
    entry = {
      key: "minVersion",
      value: { ...settings.minVersion, [platform]: version },
      action: "ENGAGE_SET_MIN_VERSION",
      details: version
        ? `Minimum ${PLATFORM_LABELS[platform]} extension version set to ${version}`
        : `Minimum ${PLATFORM_LABELS[platform]} extension version removed`,
      oldValue: { [platform]: settings.minVersion[platform] },
      newValue: { [platform]: version },
    }
  }

  await saveGlobalSetting(entry.key, entry.value, gate.admin.email)
  await logAdminAction({
    adminEmail: gate.admin.email,
    action: entry.action,
    details: entry.details,
    ipAddress: getRequestIp(req),
    product: "engage",
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    reason: change.reason || null,
  })
  return NextResponse.json(await state())
}
