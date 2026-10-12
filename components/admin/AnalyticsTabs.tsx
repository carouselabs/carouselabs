"use client"

// /admin/analytics — Charts / Cohorts tab switcher. Only the active tab is
// mounted, so switching away stops that tab's polling/fetch.
import { useState } from "react"
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts"
import { CohortTable } from "@/components/admin/CohortTable"

const TABS = [
  { key: "charts", label: "Charts" },
  { key: "cohorts", label: "Cohorts" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export function AnalyticsTabs() {
  const [tab, setTab] = useState<TabKey>("charts")

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-control-sm border border-border bg-background p-1">
        {TABS.map((t) => (
          <button
            aria-pressed={tab === t.key}
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-caption font-medium transition-colors ${
              tab === t.key ? "bg-surface-raised text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "charts" ? <AnalyticsCharts /> : <CohortTable />}
    </div>
  )
}
