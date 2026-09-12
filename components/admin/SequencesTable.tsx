"use client"

// /admin/sequences — list every drip sequence with enrollment/completion
// stats, toggle active/paused inline, and link into the builder for
// create/edit. Distinct from the one-off Broadcast composer (unaffected) —
// this is for multi-step automated drips.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Pause, Play } from "lucide-react"
import { AdminButton, AdminCard, Spinner, tableCls, fmtDate } from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

interface SequenceRow {
  id: string
  name: string
  active: boolean
  segmentType: string
  segmentValue: string | null
  stepCount: number
  enrollmentCount: number
  completionRate: number
  createdAt: string
}

const SEGMENT_LABEL: Record<string, string> = {
  all: "All Users",
  pro: "Pro Users",
  growth: "Growth Users",
  free: "Free Users",
}

export function SequencesTable() {
  const { toast } = useToast()
  const [rows, setRows] = useState<SequenceRow[] | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sequences")
      if (!res.ok) throw new Error()
      setRows((await res.json()).sequences)
    } catch {
      setRows([])
      toast("Failed to load sequences", "error")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => void load(), [load])

  async function toggleActive(row: SequenceRow) {
    setTogglingId(row.id)
    try {
      const res = await fetch(`/api/admin/sequences/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      })
      if (!res.ok) throw new Error()
      setRows((prev) => prev?.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)) ?? null)
    } catch {
      toast("Failed to update sequence", "error")
    } finally {
      setTogglingId(null)
    }
  }

  if (rows === null) return <Spinner label="Loading sequences…" />

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/admin/sequences/new">
          <AdminButton>
            <Plus className="h-3.5 w-3.5" />
            New Sequence
          </AdminButton>
        </Link>
      </div>

      <AdminCard title={`Sequences (${rows.length})`}>
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Name</th>
                <th className={tableCls.th}>Segment</th>
                <th className={tableCls.th}>Steps</th>
                <th className={tableCls.th}>Enrolled</th>
                <th className={tableCls.th}>Completion</th>
                <th className={tableCls.th}>Status</th>
                <th className={tableCls.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td className={tableCls.td} colSpan={7}>
                    No sequences yet — click New Sequence to build your first drip campaign.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className={tableCls.row}>
                  <td className={tableCls.td}>
                    <Link href={`/admin/sequences/${r.id}`} className="text-[#A78BFA] hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className={tableCls.td}>{SEGMENT_LABEL[r.segmentType] ?? r.segmentType}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{r.stepCount}</td>
                  <td className={`${tableCls.td} tabular-nums`}>{r.enrollmentCount}</td>
                  <td className={`${tableCls.td} tabular-nums`}>
                    {r.enrollmentCount > 0 ? `${Math.round(r.completionRate * 100)}%` : "—"}
                  </td>
                  <td className={tableCls.td}>
                    <button
                      onClick={() => void toggleActive(r)}
                      disabled={togglingId === r.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                        r.active
                          ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-[#2A2A2A] text-[#8A8A8A] hover:bg-[#333]"
                      }`}
                    >
                      {r.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      {r.active ? "Active" : "Paused"}
                    </button>
                  </td>
                  <td className={tableCls.td}>{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  )
}
