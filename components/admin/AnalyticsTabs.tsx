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
      <div className="inline-flex rounded-lg border border-[#2A2A2A] bg-[#141414] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
              tab === t.key ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:text-white"
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
