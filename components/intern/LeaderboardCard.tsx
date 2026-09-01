"use client"

// Leaderboard section on the intern portal — a period toggle
// (All-Time / This Month / This Week) re-fetches from
// /api/intern/leaderboard and re-sorts in place. The viewer's own row stays
// highlighted regardless of which period is selected.
import { useEffect, useState } from "react"

type Period = "all" | "month" | "week"
type Entry = { id: string; name: string; totalPoints: number }
type DateRange = { start: string; end: string }

const MEDALS = ["🥇", "🥈", "🥉"]

const PERIODS: { key: Period; label: string }[] = [
  { key: "all", label: "All-Time" },
  { key: "month", label: "This Month" },
  { key: "week", label: "This Week" },
]

function fmtRangeLabel(range: DateRange): string {
  const start = new Date(range.start)
  const end = new Date(range.end)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const endLabel = end.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" })
  return `${startLabel} - ${endLabel}`
}

export function LeaderboardCard({ internId }: { internId: string }) {
  const [period, setPeriod] = useState<Period>("all")
  const [leaderboard, setLeaderboard] = useState<Entry[] | null>(null)
  const [range, setRange] = useState<DateRange | null>(null)

  useEffect(() => {
    let cancelled = false
    setLeaderboard(null)
    fetch(`/api/intern/leaderboard?period=${period}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { leaderboard: Entry[]; range: DateRange | null }) => {
        if (cancelled) return
        setLeaderboard(data.leaderboard)
        setRange(data.range)
      })
      .catch(() => {
        if (!cancelled) setLeaderboard([])
      })
    return () => {
      cancelled = true
    }
  }, [period])

  return (
    <div className="rounded-2xl border border-[#E5E3DE] bg-white p-4 sm:p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold text-[#0A0A0A]">Leaderboard</h2>
        <div className="flex rounded-lg border border-[#E5E3DE] bg-[#F8F7F4] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                period === p.key ? "bg-[#7C3AED] text-white" : "text-[#6B7280] hover:text-[#0A0A0A]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-[11.5px] text-[#9CA3AF]">
        {range && period !== "all" ? `${PERIODS.find((p) => p.key === period)?.label} (${fmtRangeLabel(range)})` : " "}
      </p>
      {leaderboard === null ? (
        <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
      ) : leaderboard.length === 0 ? (
        <p className="text-[13px] text-[#9CA3AF]">No active interns yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#F1EFE9]">
          {leaderboard.map((entry, i) => {
            const isMe = entry.id === internId
            return (
              <li
                key={entry.id}
                className={`flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-lg ${
                  isMe ? "bg-[#7C3AED]/[0.06] border border-[#7C3AED]/30" : "border border-transparent"
                }`}
              >
                <span className="w-6 shrink-0 text-center text-[14px] leading-none">
                  {MEDALS[i] ?? <span className="text-[12px] font-semibold text-[#9CA3AF] tabular-nums">{i + 1}</span>}
                </span>
                <span
                  className={`text-[13px] flex-1 min-w-0 truncate ${
                    isMe ? "font-semibold text-[#7C3AED]" : "font-medium text-[#0A0A0A]"
                  }`}
                >
                  {entry.name}
                  {isMe && " (you)"}
                </span>
                <span className="text-[13px] font-bold tabular-nums text-[#0A0A0A]">{entry.totalPoints}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
