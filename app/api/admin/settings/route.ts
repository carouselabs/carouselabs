// GET/PUT /api/admin/settings — app-level settings (AppSetting table).
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { getAppSettings, saveAppSettings } from "@/lib/appSettings"

const SettingsSchema = z.object({
  planPrice: z.number().positive().max(10000),
  freePostLimit: z.number().int().min(0).max(1000),
  proCredits: z.number().int().min(1).max(1_000_000),
  freeCarouselEnabled: z.boolean(),
  linkedinPostingEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
})

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return NextResponse.json(await getAppSettings())
}

export async function PUT(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let parsed
  try {
    parsed = SettingsSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 })
  }

  await saveAppSettings(parsed)
  return NextResponse.json({ ok: true, settings: parsed })
}
