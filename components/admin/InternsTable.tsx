"use client"

// /admin/interns — intern roster doubling as the leaderboard: ranked by
// all-time points descending (server-sorted), with medal badges for the top
// 3. "Add Intern" opens a create modal; clicking a row goes to the intern's
// detail page.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"
import {
  AdminButton,
  AdminInput,
  Modal,
  Spinner,
  fmtDate,
  tableCls,
} from "@/components/admin/ui"
import { useToast } from "@/components/admin/Toast"

type InternRow = {
  id: string
  name: string
  email: string
  active: boolean
  totalPoints: number
  pointsToday: number
  pointsThisWeek: number
  lastEntryDate: string | null
}

const MEDALS = ["🥇", "🥈", "🥉"]

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank - 1]
  return medal ? (
    <span className="text-[16px] leading-none" aria-label={`Rank ${rank}`}>
      {medal}
    </span>
  ) : (
    <span className="text-[12.5px] font-semibold text-[#8A8A8A] tabular-nums">#{rank}</span>
  )
}

export function InternsTable() {
  const router = useRouter()
  const { toast } = useToast()

  const [rows, setRows] = useState<InternRow[] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch("/api/admin/interns")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(data.interns)
    } catch {
      toast("Failed to load interns", "error")
      setRows([])
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => void load(), [])

  const addIntern = async () => {
    if (!name.trim() || !email.trim()) {
      toast("Name and email are required", "error")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/admin/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error)
      toast("Intern added", "success")
      setAddOpen(false)
      setName("")
      setEmail("")
      await load()
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Failed to add intern", "error")
    } finally {
      setBusy(false)
    }
  }

  if (rows === null) return <Spinner label="Loading interns…" />

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[#6A6A6A]">
          {rows.length} intern{rows.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto">
          <AdminButton onClick={() => setAddOpen(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Add Intern
          </AdminButton>
        </div>
      </div>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>Rank</th>
              <th className={tableCls.th}>Name</th>
              <th className={tableCls.th}>Email</th>
              <th className={tableCls.th}>Status</th>
              <th className={tableCls.th}>Total Points</th>
              <th className={tableCls.th}>This Week</th>
              <th className={tableCls.th}>Today</th>
              <th className={tableCls.th}>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className={tableCls.td} colSpan={8}>
                  No interns yet
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={`${tableCls.row} cursor-pointer`}
                onClick={() => router.push(`/admin/interns/${r.id}`)}
              >
                <td className={tableCls.td}>
                  <RankBadge rank={i + 1} />
                </td>
                <td className={tableCls.td}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[11px] font-bold text-[#A78BFA]">
                      {r.name[0]?.toUpperCase()}
                    </div>
                    <span className="text-white">{r.name}</span>
                  </div>
                </td>
                <td className={`${tableCls.td} text-[#A78BFA]`}>{r.email}</td>
                <td className={tableCls.td}>
                  {r.active ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-[11px] font-medium text-[#8A8A8A]">
                      INACTIVE
                    </span>
                  )}
                </td>
                <td className={`${tableCls.td} tabular-nums font-semibold text-white`}>{r.totalPoints}</td>
                <td className={`${tableCls.td} tabular-nums`}>{r.pointsThisWeek}</td>
                <td className={`${tableCls.td} tabular-nums`}>{r.pointsToday}</td>
                <td className={tableCls.td}>{r.lastEntryDate ? fmtDate(r.lastEntryDate) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Intern">
        <div className="space-y-3">
          <AdminInput
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
          <AdminInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <p className="text-[11px] text-[#6A6A6A]">
            Their account links automatically the first time they sign in with this email.
          </p>
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </AdminButton>
            <AdminButton loading={busy} onClick={addIntern}>
              Add Intern
            </AdminButton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
