"use client"

// Engage → Health: is Engage working right now (/api/admin/engage/health) —
// database, setup SQL, AI keys, each AI model's last hour, the last hour's
// generations and errors, and anything switched off in Controls. Checked
// fresh on opening and on Check again.
import { CheckCircle2, CircleSlash, AlertTriangle, XCircle, RotateCw } from "lucide-react"
import Link from "next/link"
import { AdminButton, fmtDateTime } from "@/components/admin/ui"
import type { EngageHealth as HealthData, HealthStatus } from "@/lib/engage/health"
import { ErrorState, SkeletonBlock, useAdminApi } from "./shared"

const STATUS: Record<HealthStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: "OK", className: "text-success", Icon: CheckCircle2 },
  warn: { label: "Needs a look", className: "text-warning", Icon: AlertTriangle },
  bad: { label: "Problem", className: "text-danger", Icon: XCircle },
  idle: { label: "No activity", className: "text-muted-foreground", Icon: CircleSlash },
}

const OVERALL: Record<HealthStatus, string> = {
  ok: "Everything is working.",
  warn: "Working, with something worth a look.",
  bad: "Something is broken.",
  idle: "Quiet: nothing happening.",
}

export function EngageHealth() {
  const { data, error, loading, reload } = useAdminApi<HealthData>("/api/admin/engage/health")

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lead font-semibold tracking-tight text-foreground">Health</h2>
          <p className="mt-0.5 text-caption text-muted-foreground">
            Is Engage working right now. {data ? `Checked ${fmtDateTime(data.checkedAt)}.` : ""}
          </p>
        </div>
        <AdminButton variant="secondary" onClick={reload} loading={loading}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Check again
        </AdminButton>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <SkeletonBlock className="h-[400px]" />
      ) : (
        <>
          <div role="status" className={`rounded-card border border-border bg-surface px-4 py-3 text-label font-semibold ${STATUS[data.overall].className}`}>
            {OVERALL[data.overall]}
          </div>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface" aria-label="Checks">
            {data.checks.map((c) => {
              const s = STATUS[c.status]
              return (
                // What was checked, what was found and the status side by side,
                // the status a fixed width so the columns line up; on a phone,
                // one under the other.
                <li key={c.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5 text-caption">
                  <s.Icon className={`mt-px h-4 w-4 shrink-0 ${s.className}`} aria-hidden />
                  <div className="min-w-0 flex-1 sm:flex sm:gap-3">
                    <span className="block text-foreground/90 sm:w-2/5 sm:shrink-0">{c.label}</span>
                    <span className="block break-words text-muted-foreground sm:min-w-0 sm:flex-1">
                      {c.id === "controls" && c.status !== "ok" ? (
                        <Link href="/admin/engage/controls" className="hover:underline">
                          {c.detail}
                        </Link>
                      ) : (
                        c.detail
                      )}
                    </span>
                  </div>
                  <span className={`w-full pl-7 text-caption font-medium sm:w-[84px] sm:shrink-0 sm:pl-0 sm:text-right ${s.className}`}>{s.label}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
