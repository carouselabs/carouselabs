// lib/engage/settingsRules.ts — Engage settings that apply to everyone
// (admin → Engage → Controls), as rules: what is stored, the defaults, and
// the decisions made from them. Pure (no database, no framework), so every
// rule is unit-tested directly; lib/engage/settings.ts loads and saves them.
//
//   features    a feature paused for all users, with the message they see
//   insert      the Insert button on or off, per extension
//   minVersion  the oldest extension version still allowed to write
//   models      which AI model each feature tries first (the other is backup)
//   aiPrices    dollars per million tokens, per model, for the AI cost figures
//
// No stored value means the default: everything on, no minimum version,
// GPT Luna first everywhere, Claude Haiku's list price.
import { z } from "zod"
import { AI_MODEL_KEYS, DEFAULT_AI_PRICES, type AiModelKey, type ModelPrice } from "@/lib/ai/models"
import {
  ENGAGE_FEATURES,
  ENGAGE_PLATFORMS,
  FEATURE_LABELS,
  type EngageFeature,
  type EngagePlatform,
} from "@/lib/engage/features"

export const SETTING_KEYS = ["features", "insert", "minVersion", "models", "aiPrices"] as const
export type SettingKey = (typeof SETTING_KEYS)[number]

// What the extensions send in x-engage-version (lib/extensionCommentAuth.ts).
export const VERSION_PATTERN = /^\d{1,4}(\.\d{1,4}){1,3}$/
export const PAUSE_MESSAGE_MAX = 200

const featureSwitch = z.object({
  enabled: z.boolean(),
  // What people see while it's paused; null for the standard wording.
  message: z.string().trim().max(PAUSE_MESSAGE_MAX).nullable(),
})

export const SETTING_SCHEMAS = {
  features: z.partialRecord(z.enum(ENGAGE_FEATURES), featureSwitch),
  insert: z.partialRecord(z.enum(ENGAGE_PLATFORMS), z.boolean()),
  minVersion: z.partialRecord(z.enum(ENGAGE_PLATFORMS), z.string().regex(VERSION_PATTERN).nullable()),
  models: z.partialRecord(z.enum(ENGAGE_FEATURES), z.enum(AI_MODEL_KEYS)),
  aiPrices: z.record(
    z.string().min(1).max(100),
    z.object({ input: z.number().min(0).max(1000), output: z.number().min(0).max(1000) }),
  ),
} satisfies Record<SettingKey, z.ZodType>

export interface FeatureSwitch {
  enabled: boolean
  message: string | null
}

export interface EngageGlobalSettings {
  features: Record<EngageFeature, FeatureSwitch>
  insert: Record<EngagePlatform, boolean>
  minVersion: Record<EngagePlatform, string | null>
  models: Record<EngageFeature, AiModelKey>
  // Keyed by model id (lib/ai/models.ts).
  aiPrices: Record<string, ModelPrice>
}

export function defaultGlobalSettings(): EngageGlobalSettings {
  return {
    features: Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, { enabled: true, message: null }])) as Record<
      EngageFeature,
      FeatureSwitch
    >,
    insert: { linkedin: true, x: true },
    minVersion: { linkedin: null, x: null },
    models: Object.fromEntries(ENGAGE_FEATURES.map((f) => [f, "luna"])) as Record<EngageFeature, AiModelKey>,
    aiPrices: { ...DEFAULT_AI_PRICES },
  }
}

// The stored rows, over the defaults. A value that fails validation (a hand
// edit, an older shape) is ignored for that key rather than breaking every
// generation; unknown keys are ignored.
export function globalSettingsFrom(rows: { key: string; value: unknown }[]): EngageGlobalSettings {
  const settings = defaultGlobalSettings()
  for (const row of rows) {
    if (row.key === "features") {
      const parsed = SETTING_SCHEMAS.features.safeParse(row.value)
      if (parsed.success) Object.assign(settings.features, parsed.data)
    } else if (row.key === "insert") {
      const parsed = SETTING_SCHEMAS.insert.safeParse(row.value)
      if (parsed.success) Object.assign(settings.insert, parsed.data)
    } else if (row.key === "minVersion") {
      const parsed = SETTING_SCHEMAS.minVersion.safeParse(row.value)
      if (parsed.success) Object.assign(settings.minVersion, parsed.data)
    } else if (row.key === "models") {
      const parsed = SETTING_SCHEMAS.models.safeParse(row.value)
      if (parsed.success) Object.assign(settings.models, parsed.data)
    } else if (row.key === "aiPrices") {
      const parsed = SETTING_SCHEMAS.aiPrices.safeParse(row.value)
      if (parsed.success) Object.assign(settings.aiPrices, parsed.data)
    }
  }
  return settings
}

// ── Versions ────────────────────────────────────────────────────────────

// Numeric, part by part: "1.10.0" is newer than "1.9.2"; missing parts are 0.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

// Whether a request's extension is older than the minimum. No minimum: never.
// No version at all (LinkedIn versions before 1.3.0 didn't send one) or an
// unreadable one: older than any minimum.
export function isOutdated(version: string | null | undefined, min: string | null): boolean {
  if (!min) return false
  const v = version?.trim() ?? ""
  if (!VERSION_PATTERN.test(v)) return true
  return compareVersions(v, min) < 0
}

// The extension a request comes from: the X extension's routes are all under
// /api/ext/x/.
export function requestPlatform(pathname: string): EngagePlatform {
  return pathname.startsWith("/api/ext/x/") ? "x" : "linkedin"
}

const PRODUCT_NAMES: Record<EngagePlatform, string> = {
  linkedin: "CarouseLabs Engage",
  x: "CarouseLabs Engage for X",
}

export function updateRequiredMessage(platform: EngagePlatform): string {
  return (
    `This version of ${PRODUCT_NAMES[platform]} is out of date. Chrome updates it by itself within a few hours; ` +
    "to update now, open chrome://extensions, turn on Developer mode and click Update."
  )
}

// ── Paused features ─────────────────────────────────────────────────────

export function pausedMessage(feature: EngageFeature, settings: Pick<EngageGlobalSettings, "features">): string {
  return settings.features[feature].message || `${FEATURE_LABELS[feature]}: paused for a little while. Please try again later.`
}
