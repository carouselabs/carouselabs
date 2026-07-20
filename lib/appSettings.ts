// lib/appSettings.ts
// App-level settings stored as one Json row in AppSetting (key "app").
// Defaults apply until the admin saves overrides, so reads never break.
import { db } from "@/lib/db"

export type AppSettings = {
  planPrice: number
  freePostLimit: number
  proCredits: number
  freeCarouselEnabled: boolean
  linkedinPostingEnabled: boolean
  maintenanceMode: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  planPrice: 24.99,
  freePostLimit: 1,
  proCredits: 1000,
  freeCarouselEnabled: false,
  linkedinPostingEnabled: true,
  maintenanceMode: false,
}

const KEY = "app"

export async function getAppSettings(): Promise<AppSettings> {
  const row = await db.appSetting.findUnique({ where: { key: KEY } })
  const stored = (row?.value ?? {}) as Partial<AppSettings>
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await db.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: settings },
    update: { value: settings },
  })
}
