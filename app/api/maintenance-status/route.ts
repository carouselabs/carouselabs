// GET /api/maintenance-status — public, runtime-only read of the
// maintenance-mode flag. Marketing/app layouts fetch this client-side
// instead of calling getAppSettings() server-side, since a server-side DB
// call in those layouts would run during static generation of the ~589 SEO
// pages and fail the build when the DB isn't reachable at build time.
import { NextResponse } from "next/server"
import { getAppSettings } from "@/lib/appSettings"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const settings = await getAppSettings()
    return NextResponse.json({ maintenanceMode: settings.maintenanceMode ?? false })
  } catch {
    // DB unreachable — fail closed (no banner) rather than break the request.
    return NextResponse.json({ maintenanceMode: false })
  }
}
