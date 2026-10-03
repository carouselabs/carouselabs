// lib/engage/settings.ts — loads and saves the Engage settings that apply to
// everyone (lib/engage/settingsRules.ts). Read on every generation and by the
// Insert switch (/api/ext/config), so each server instance keeps them for a
// few seconds: an admin change reaches everyone within SETTINGS_CACHE_MS.
//
// Reading never fails a request: before scripts/engage-admin-phase-b.sql has
// run, or if the database can't be read, the last settings read (or the
// defaults: everything on, no minimum) apply.
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { VERSION_HEADER } from "@/lib/extensionCommentAuth"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import {
  defaultGlobalSettings,
  globalSettingsFrom,
  isOutdated,
  requestPlatform,
  updateRequiredMessage,
  type EngageGlobalSettings,
  type SettingKey,
} from "@/lib/engage/settingsRules"

export const SETTINGS_CACHE_MS = 10_000

let cache: { at: number; settings: EngageGlobalSettings } | null = null
let warnedMissing = false

export async function loadGlobalSettings(now: number = Date.now()): Promise<EngageGlobalSettings> {
  if (cache && now - cache.at < SETTINGS_CACHE_MS) return cache.settings
  let settings: EngageGlobalSettings
  try {
    settings = globalSettingsFrom(await db.engageSetting.findMany({ select: { key: true, value: true } }))
  } catch (err) {
    // Before the phase B SQL has run: the defaults, said once per instance.
    if (!isEngageSchemaMissing(err)) {
      console.error("[engage/settings] couldn't read EngageSetting; using the last known settings or the defaults:", err)
    } else if (!warnedMissing) {
      warnedMissing = true
      console.warn("[engage/settings] EngageSetting missing — run scripts/engage-admin-phase-b.sql. Using the defaults.")
    }
    settings = cache?.settings ?? defaultGlobalSettings()
  }
  cache = { at: now, settings }
  return settings
}

// After a save, this instance uses the new value at once (others within
// SETTINGS_CACHE_MS).
export function clearGlobalSettingsCache(): void {
  cache = null
}

export async function saveGlobalSetting(key: SettingKey, value: Prisma.InputJsonValue, adminEmail: string): Promise<void> {
  await db.engageSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: adminEmail },
    update: { value, updatedBy: adminEmail },
  })
  clearGlobalSettingsCache()
}

// A writing request from an extension older than the minimum version an admin
// set for it: 426, with how to update. null when it may go ahead.
export async function outdatedExtensionResponse(req: Request): Promise<NextResponse | null> {
  const settings = await loadGlobalSettings()
  const platform = requestPlatform(new URL(req.url).pathname)
  if (!isOutdated(req.headers.get(VERSION_HEADER), settings.minVersion[platform])) return null
  return NextResponse.json({ error: updateRequiredMessage(platform), code: "update_required" }, { status: 426 })
}
