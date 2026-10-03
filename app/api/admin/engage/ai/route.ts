// /api/admin/engage/ai — AI usage and cost (lib/engage/aiQueries.ts), the AI
// model each feature tries first, and the price per model.
//
// GET    ?range= (&from=&to= for custom) &platform=all|linkedin|x
//        { usage, models, prices, settingsReady, rangeKey }
// PATCH  one change at a time, written to the audit log:
//          { model: { feature, key } }            the model a feature tries first (the other is backup)
//          { price: { model, input, output } }    dollars per million tokens
//        plus an optional reason. Takes effect within SETTINGS_CACHE_MS.
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { parseBody } from "@/lib/engage/adminApi"
import { aiUsage } from "@/lib/engage/aiQueries"
import { ENGAGE_FEATURES, FEATURE_LABELS } from "@/lib/engage/features"
import { resolveRange } from "@/lib/engage/ranges"
import { readGlobalSettingsFresh, saveGlobalSetting } from "@/lib/engage/settings"
import { AI_MODEL_KEYS, AI_MODELS, modelLabel } from "@/lib/ai/models"
import type { OverviewPlatform } from "@/lib/engage/adminQueries"
import { getRequestIp, logAdminAction } from "@/lib/auditLog"

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const range = resolveRange(url.searchParams.get("range"), url.searchParams.get("from"), url.searchParams.get("to"))
  if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  const p = url.searchParams.get("platform") ?? "all"
  if (p !== "all" && p !== "linkedin" && p !== "x") return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  const platform: OverviewPlatform = p

  const { ready, settings } = await readGlobalSettingsFresh()
  const usage = await aiUsage(range.from, range.to, platform, settings.aiPrices)
  return NextResponse.json({ usage, models: settings.models, prices: settings.aiPrices, settingsReady: ready, rangeKey: range.key })
}

const reason = z.string().trim().max(500).optional()
const dollars = z.number().min(0).max(1000)
const body = z.union([
  z.object({ model: z.object({ feature: z.enum(ENGAGE_FEATURES), key: z.enum(AI_MODEL_KEYS) }), reason }),
  z.object({
    price: z.object({ model: z.string().trim().min(1).max(100), input: dollars, output: dollars }),
    reason,
  }),
])

export async function PATCH(req: Request) {
  const gate = await requireEngagePermission(req, "engage.controls.manage")
  if (!gate.ok) return gate.response
  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const change = parsed.data

  const { ready, settings } = await readGlobalSettingsFresh()
  if (!ready) {
    return NextResponse.json({ error: "Run scripts/engage-admin-phase-b.sql in Supabase first, then try again." }, { status: 409 })
  }

  if ("model" in change) {
    const { feature, key } = change.model
    const before = settings.models[feature]
    await saveGlobalSetting("models", { ...settings.models, [feature]: key }, gate.admin.email)
    await logAdminAction({
      adminEmail: gate.admin.email,
      action: "ENGAGE_SET_AI_MODEL",
      details: `${FEATURE_LABELS[feature]} now writes with ${AI_MODELS[key].label} first (${AI_MODELS[key === "luna" ? "haiku" : "luna"].label} as backup)`,
      ipAddress: getRequestIp(req),
      product: "engage",
      oldValue: { [feature]: before },
      newValue: { [feature]: key },
      reason: change.reason || null,
    })
  } else {
    const { model, input, output } = change.price
    const before = settings.aiPrices[model] ?? null
    await saveGlobalSetting("aiPrices", { ...settings.aiPrices, [model]: { input, output } }, gate.admin.email)
    await logAdminAction({
      adminEmail: gate.admin.email,
      action: "ENGAGE_SET_AI_PRICE",
      details: `${modelLabel(model)} price set to $${input} in / $${output} out per million tokens`,
      ipAddress: getRequestIp(req),
      product: "engage",
      oldValue: { [model]: before },
      newValue: { [model]: { input, output } },
      reason: change.reason || null,
    })
  }

  const fresh = await readGlobalSettingsFresh()
  return NextResponse.json({ models: fresh.settings.models, prices: fresh.settings.aiPrices, settingsReady: fresh.ready })
}
