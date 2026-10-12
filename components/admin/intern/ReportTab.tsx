"use client"

// Tab 5 — Performance Report: a printable summary combining profile info,
// point/category/trend breakdowns, attendance + leave, and review notes.
// "Print / Export" is just window.print() — AdminShell's chrome (sidebar,
// topbar) and the tab nav below are hidden via print:hidden so only this
// card prints.
import { Printer } from "lucide-react"
import { AdminButton, AdminCard, fmtDate, fmtDateTime } from "@/components/admin/ui"
import { AdminBarChart, AdminLineChart, CHART_COLORS } from "@/components/admin/charts"
import { formatInternshipDuration } from "@/lib/internDuration"
import type { AttendanceRecord, InternEntry, InternNoteT, InternProfile } from "@/components/admin/intern/types"

function attendanceRate(attendance: AttendanceRecord[]): string {
  const relevant = attendance.filter((a) => a.status !== "leave")
  if (relevant.length === 0) return "—"
  const score = relevant.reduce((sum, a) => {
    if (a.status === "present") return sum + 1
    if (a.status === "half-day") return sum + 0.5
    return sum
  }, 0)
  return `${Math.round((score / relevant.length) * 100)}%`
}

function categoryBreakdown(entries: InternEntry[]) {
  const byCategory = new Map<string, number>()
  for (const e of entries) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.points)
  }
  return [...byCategory.entries()]
    .map(([category, points]) => ({ category, points }))
    .sort((a, b) => b.points - a.points)
}

function pointsTrend(entries: InternEntry[]) {
  const byDay = new Map<string, number>()
  for (const e of entries) {
    const day = e.date.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + e.points)
  }
  const days = [...byDay.keys()].sort()
  let running = 0
  return days.map((day) => {
    running += byDay.get(day)!
    return { date: day, total: running }
  })
}

export function ReportTab({
  intern,
  entries,
  attendance,
  notes,
}: {
  intern: InternProfile
  entries: InternEntry[]
  attendance: AttendanceRecord[]
  notes: InternNoteT[]
}) {
  const categories = categoryBreakdown(entries)
  const trend = pointsTrend(entries)
  const reviewNotes = notes.filter((n) => n.type === "review")

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden">
        <AdminButton onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />
          Print / Export
        </AdminButton>
      </div>

      <AdminCard title="Performance Report" className="print:border-none print:bg-white print:text-black">
        <div className="grid grid-cols-2 gap-4 border-b border-[#2A2A2A] pb-5 text-[13px] print:border-black/10">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#6A6A6A] print:text-black/50">Intern</div>
            <div className="mt-1 font-semibold text-white print:text-black">{intern.name}</div>
            <div className="text-[#8A8A8A] print:text-black/70">{intern.email}</div>
            <div className="text-[#8A8A8A] print:text-black/70">
              {[intern.role, intern.department].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#6A6A6A] print:text-black/50">
              Internship Period
            </div>
            <div className="mt-1 text-white print:text-black">
              {fmtDate(intern.joinDate)} → {fmtDate(intern.endDate)}
            </div>
            <div className="text-[#8A8A8A] print:text-black/70">
              {formatInternshipDuration(new Date(intern.joinDate), new Date(intern.endDate))} · status:{" "}
              {intern.status}
            </div>
            <div className="text-[#8A8A8A] print:text-black/70">
              {intern.progress.isCompleted
                ? "Ended"
                : `${intern.progress.percentComplete}% complete, ${intern.progress.daysRemaining} days remaining`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-5 text-[13px] md:grid-cols-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#6A6A6A] print:text-black/50">
              Total Points
            </div>
            <div className="mt-1 text-[20px] font-bold tabular-nums text-white print:text-black">
              {intern.totalPoints}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#6A6A6A] print:text-black/50">
              Attendance Rate
            </div>
            <div className="mt-1 text-[20px] font-bold tabular-nums text-white print:text-black">
              {attendanceRate(attendance)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#6A6A6A] print:text-black/50">
              Leave Used
            </div>
            <div className="mt-1 text-[20px] font-bold tabular-nums text-white print:text-black">
              {intern.leaveBalance.used}/{intern.leaveBalance.total}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#6A6A6A] print:text-black/50">
              Leaderboard Rank
            </div>
            <div className="mt-1 text-[20px] font-bold tabular-nums text-white print:text-black">
              {intern.rank ? `#${intern.rank}` : "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 border-t border-[#2A2A2A] pt-5 md:grid-cols-2 print:border-black/10">
          <div>
            <h4 className="mb-3 text-[12.5px] font-semibold text-white print:text-black">Points by Category</h4>
            {categories.length === 0 ? (
              <p className="text-[12.5px] text-[#6A6A6A]">No entries yet.</p>
            ) : (
              <AdminBarChart
                data={categories}
                xKey="category"
                yKey="points"
                label="Points"
                color={CHART_COLORS.violet}
                height={220}
              />
            )}
          </div>
          <div>
            <h4 className="mb-3 text-[12.5px] font-semibold text-white print:text-black">Points Trend</h4>
            {trend.length === 0 ? (
              <p className="text-[12.5px] text-[#6A6A6A]">No entries yet.</p>
            ) : (
              <AdminLineChart
                data={trend}
                xKey="date"
                series={[{ key: "total", label: "Cumulative points", color: CHART_COLORS.teal }]}
                height={220}
              />
            )}
          </div>
        </div>

        {reviewNotes.length > 0 && (
          <div className="mt-6 border-t border-[#2A2A2A] pt-5 print:border-black/10">
            <h4 className="mb-3 text-[12.5px] font-semibold text-white print:text-black">Review Notes</h4>
            <ul className="space-y-3">
              {reviewNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/[0.06] p-3.5 print:border-black/20 print:bg-transparent"
                >
                  <div className="text-[11px] text-[#8A8A8A] print:text-black/60">
                    {n.addedBy} · {fmtDateTime(n.createdAt)}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#D0D0D0] print:text-black">
                    {n.content}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminCard>
    </div>
  )
}
