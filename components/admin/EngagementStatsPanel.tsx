"use client"

// Open/click stats for one EmailSequence, sourced from
// GET /api/admin/sequences/[id]/engagement. Rendered from SequenceBuilder in
// two modes:
//   - stepId given  → a small inline block under that one step's card
//   - stepId omitted → the whole-sequence rollup table, shown once below all steps
import { useEffect, useState } from "react"
import { AdminCard, tableCls } from "@/components/admin/ui"

interface VariantStats {
  sent: number
  opened: number
  clicked: number
  openRate: number
  clickRate: number
}

interface StepStats {
  stepId: string
  stepOrder: number
  subject: string
  hasVariant: boolean
  overall: VariantStats & { bounced: number }
  variantA?: VariantStats
  variantB?: VariantStats
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function EngagementStatsPanel({ sequenceId, stepId }: { sequenceId: string; stepId?: string }) {
  const [steps, setSteps] = useState<StepStats[] | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/admin/sequences/${sequenceId}/engagement`)
      .then((r) => (r.ok ? r.json() : { steps: [] }))
      .then((d: { steps: StepStats[] }) => {
        if (active) setSteps(d.steps)
      })
      .catch(() => {
        if (active) setSteps([])
      })
    return () => {
      active = false
    }
  }, [sequenceId])

  if (steps === null) return null

  if (stepId) {
    const s = steps.find((x) => x.stepId === stepId)
    if (!s || s.overall.sent === 0) return null
    return (
      <div className="pt-3 border-t border-[#2A2A2A] space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8A8A]">Engagement</p>
        <p className="text-[12px] text-[#B0B0B0]">
          {s.overall.sent} sent · {pct(s.overall.openRate)} opened · {pct(s.overall.clickRate)} clicked
          {s.overall.bounced > 0 ? ` · ${s.overall.bounced} bounced` : ""}
        </p>
        {s.hasVariant && s.variantA && s.variantB && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] text-[#B0B0B0]">
            <p>
              <span className="font-semibold text-white">Variant A</span> — {s.variantA.sent} sent ·{" "}
              {pct(s.variantA.openRate)} open · {pct(s.variantA.clickRate)} click
            </p>
            <p>
              <span className="font-semibold text-white">Variant B</span> — {s.variantB.sent} sent ·{" "}
              {pct(s.variantB.openRate)} open · {pct(s.variantB.clickRate)} click
            </p>
          </div>
        )}
      </div>
    )
  }

  const totalSent = steps.reduce((sum, s) => sum + s.overall.sent, 0)
  if (totalSent === 0) return null

  return (
    <AdminCard title="Engagement by Step">
      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Step</th>
              <th className={tableCls.th}>Sent</th>
              <th className={tableCls.th}>Open Rate</th>
              <th className={tableCls.th}>Click Rate</th>
              <th className={tableCls.th}>A/B</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.stepId} className={tableCls.row}>
                <td className={`${tableCls.td} max-w-[280px] truncate`}>
                  Step {s.stepOrder + 1}: {s.subject}
                </td>
                <td className={`${tableCls.td} tabular-nums`}>{s.overall.sent}</td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {s.overall.sent > 0 ? pct(s.overall.openRate) : "—"}
                </td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {s.overall.sent > 0 ? pct(s.overall.clickRate) : "—"}
                </td>
                <td className={`${tableCls.td} text-[#8A8A8A]`}>
                  {s.hasVariant && s.variantA && s.variantB
                    ? `A: ${pct(s.variantA.openRate)} · B: ${pct(s.variantB.openRate)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  )
}
