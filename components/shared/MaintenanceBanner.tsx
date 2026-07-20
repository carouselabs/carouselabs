import { AlertTriangle } from "lucide-react"

// Informational only — never gates access. Rendered by (app) and
// (marketing) layouts when AppSettings.maintenanceMode is true. Admins see
// it too (nothing here blocks them; the layouts never redirect on this flag).
export function MaintenanceBanner() {
  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-2 bg-amber-400 px-4 py-2 text-center text-[13px] font-medium text-amber-950">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      CarouseLabs is currently under maintenance. Some features may be unavailable. We&apos;ll be
      back shortly!
    </div>
  )
}
