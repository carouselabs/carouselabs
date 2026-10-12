"use client"

// Weekly signup cohorts (last 8 weeks) — retention heatmap. Data comes from
// the same /api/admin/analytics endpoint as the charts tab; only fetched
// while this tab is mounted.
import { useEffect, useState, type CSSProperties } from "react"
import { AdminCard, Spinner, tableCls } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type CohortRow = {
  weekStart: string
  weekEnd: string
  newUsers: number
  postedWeek1: number
  postedWeek2: number
  convertedToPro: number
  retentionPct: number
}

function fmtWeek(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${s} – ${e}`
}

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "—"
}

// Retention heatmap cell — single-hue (violet) intensity scaling with
// retention%, so darker/more saturated reads as "higher retention" per spec.
function retentionCellStyle(retentionPct: number): CSSProperties {
  const alpha = 0.08 + (retentionPct / 100) * 0.55
  return { backgroundColor: `rgba(139, 92, 246, ${alpha.toFixed(2)})` }
}

export function CohortTable() {
  const { toast } = useToast()
  const [rows, setRows] = useState<CohortRow[] | null>(null)

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => setRows(data.cohorts))
      .catch(() => {
        toast("Failed to load cohort data", "error")
        setRows([])
      })
  }, [toast])

  if (rows === null) return <Spinner label="Loading cohorts…" />

  return (
    <AdminCard title="Weekly Signup Cohorts (last 8 weeks)">
      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Week</th>
              <th className={tableCls.th}>New Users</th>
              <th className={tableCls.th}>Posted (week 1)</th>
              <th className={tableCls.th}>Posted (week 2)</th>
              <th className={tableCls.th}>Converted to Pro</th>
              <th className={tableCls.th}>Retention %</th>
            </tr>
          </thead>
          <tbody>
            {rows.every((r) => r.newUsers === 0) && (
              <tr>
                <td className={tableCls.td} colSpan={6}>
                  No signups in the last 8 weeks
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.weekStart} className={tableCls.row}>
                <td className={tableCls.td}>{fmtWeek(r.weekStart, r.weekEnd)}</td>
                <td className={`${tableCls.td} tabular-nums`}>{r.newUsers}</td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {r.postedWeek1} <span className="text-[#6A6A6A]">({pct(r.postedWeek1, r.newUsers)})</span>
                </td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {r.postedWeek2} <span className="text-[#6A6A6A]">({pct(r.postedWeek2, r.newUsers)})</span>
                </td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {r.convertedToPro}{" "}
                  <span className="text-[#6A6A6A]">({pct(r.convertedToPro, r.newUsers)})</span>
                </td>
                <td className={`${tableCls.td} tabular-nums font-semibold text-white`} style={retentionCellStyle(r.retentionPct)}>
                  {r.retentionPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#6A6A6A]">
        &quot;Week 1&quot;/&quot;week 2&quot; are measured relative to each user&apos;s own signup date.
        Retention % = posted-in-week-2 ÷ cohort size. &quot;Converted to Pro&quot; reflects current plan
        status (there&apos;s no upgrade-timestamp column yet, so a true 30-day conversion window isn&apos;t
        derivable from the data).
      </p>
    </AdminCard>
  )
}
