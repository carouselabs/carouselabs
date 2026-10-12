"use client"

// Informational only — never gates access. Rendered unconditionally by
// (app) and (marketing) layouts; fetches its own visibility client-side from
// /api/maintenance-status instead of the layout calling getAppSettings()
// server-side. That server call ran during static generation of the ~589 SEO
// pages and broke the build whenever the DB was unreachable at build time —
// moving it behind a client fetch keeps those pages statically generatable.
import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

export function MaintenanceBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    fetch("/api/maintenance-status")
      .then((r) => r.json())
      .then((data) => setShow(data.maintenanceMode ?? false))
      .catch(() => {}) // fail silently — banner just stays hidden
  }, [])

  if (!show) return null

  return (
    <div role="status" className="flex shrink-0 items-center justify-center gap-2 border-b border-warning/25 bg-warning-soft px-4 py-2 text-center text-label font-medium text-warning">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      CarouseLabs is currently under maintenance. Some features may be unavailable. We&apos;ll be
      back shortly!
    </div>
  )
}
