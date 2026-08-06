// /intern — read-only performance portal for interns. Matches the logged-in
// user's email to an Intern record; links clerkId permanently on first visit
// so future matches don't depend on email staying in sync.
import { ShieldOff } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { summarizeEntries, predefinedTaskNames, getLeaderboard } from "@/lib/internPoints"
import { PerformanceCalendar, type DayCell } from "@/components/intern/PerformanceCalendar"

export const dynamic = "force-dynamic"

const MEDALS = ["🥇", "🥈", "🥉"]

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildMonthGrid(pointsByDay: Map<string, number>, tasksByDay: Map<string, string[]>) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: DayCell[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, points: null, tasks: [] })
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(new Date(year, month, d))
    cells.push({
      day: d,
      points: pointsByDay.has(key) ? pointsByDay.get(key)! : null,
      tasks: tasksByDay.get(key) ?? [],
    })
  }

  return { cells, monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }
}

export default async function InternPage() {
  const user = await getCurrentUser()
  if (!user) return null // AppLayout already redirects unauthenticated visitors

  let intern = await db.intern.findUnique({
    where: { email: user.email },
    include: { entries: { orderBy: { date: "desc" } } },
  })

  if (!intern) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(26,26,26,0.1)] border border-[rgba(26,26,26,0.18)] flex items-center justify-center">
          <ShieldOff size={20} className="text-[#1A1A1A]" strokeWidth={1.8} />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-medium text-[#0A0A0A]">You don&apos;t have intern access</p>
          <p className="text-[13px] text-[#6B7280] max-w-xs">
            This page is only available to interns tracked on the CarouseLabs points board.
          </p>
        </div>
      </div>
    )
  }

  if (!intern.clerkId) {
    intern = await db.intern.update({
      where: { id: intern.id },
      data: { clerkId: user.clerkId },
      include: { entries: { orderBy: { date: "desc" } } },
    })
  }

  const { total, pointsToday, pointsThisWeek } = summarizeEntries(intern.entries)
  const taskNames = await predefinedTaskNames()
  const leaderboard = await getLeaderboard()

  const pointsByDay = new Map<string, number>()
  const tasksByDay = new Map<string, string[]>()
  for (const e of intern.entries) {
    const key = dayKey(e.date)
    pointsByDay.set(key, (pointsByDay.get(key) ?? 0) + e.points)
    const tasks = tasksByDay.get(key) ?? []
    if (!tasks.includes(e.category)) tasks.push(e.category)
    tasksByDay.set(key, tasks)
  }
  const { cells, monthLabel } = buildMonthGrid(pointsByDay, tasksByDay)
  const recent = intern.entries.slice(0, 15)

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold text-[#0A0A0A] tracking-[-0.4px]">Your Performance</h1>
        <p className="text-[14px] text-[#6B7280] leading-[1.5]">
          {intern.name} · {intern.email}
          {!intern.active && (
            <span className="ml-2 inline-flex rounded-full bg-[#F1EFE9] px-2 py-0.5 text-[11px] font-medium text-[#6B7280]">
              INACTIVE
            </span>
          )}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">
          <span className="text-[12px] font-medium text-[#6B7280]">Total Points</span>
          <div className="mt-2 text-[26px] font-bold leading-none text-[#0A0A0A] tabular-nums">{total}</div>
        </div>
        <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">
          <span className="text-[12px] font-medium text-[#6B7280]">This Week</span>
          <div className="mt-2 text-[26px] font-bold leading-none text-[#0A0A0A] tabular-nums">
            {pointsThisWeek}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">
          <span className="text-[12px] font-medium text-[#6B7280]">Today</span>
          <div className="mt-2 text-[26px] font-bold leading-none text-[#0A0A0A] tabular-nums">
            {pointsToday}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-[#0A0A0A]">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF]">No active interns yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#F1EFE9]">
            {leaderboard.map((entry, i) => {
              const isMe = entry.id === intern.id
              return (
                <li
                  key={entry.id}
                  className={`flex items-center gap-3 py-2.5 px-2.5 -mx-2.5 rounded-lg ${
                    isMe ? "bg-[#7C3AED]/[0.06] border border-[#7C3AED]/30" : "border border-transparent"
                  }`}
                >
                  <span className="w-6 shrink-0 text-center text-[14px] leading-none">
                    {MEDALS[i] ?? (
                      <span className="text-[12px] font-semibold text-[#9CA3AF] tabular-nums">{i + 1}</span>
                    )}
                  </span>
                  <span
                    className={`text-[13px] flex-1 min-w-0 truncate ${
                      isMe ? "font-semibold text-[#7C3AED]" : "font-medium text-[#0A0A0A]"
                    }`}
                  >
                    {entry.name}
                    {isMe && " (you)"}
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-[#0A0A0A]">
                    {entry.totalPoints}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Calendar */}
      <PerformanceCalendar cells={cells} monthLabel={monthLabel} />

      {/* Recent entries */}
      <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-[#0A0A0A]">Recent Entries</h2>
        {recent.length === 0 ? (
          <p className="text-[13px] text-[#9CA3AF]">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#F1EFE9]">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[#0A0A0A]">{e.category}</span>
                    {taskNames.has(e.category) ? (
                      <span className="inline-flex rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
                        TASK
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#F1EFE9] px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF]">
                        CUSTOM
                      </span>
                    )}
                  </div>
                  {e.note && <span className="text-[12px] text-[#9CA3AF] truncate">{e.note}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[12px] text-[#9CA3AF]">{fmtDate(e.date)}</span>
                  <span
                    className={`text-[13px] font-bold tabular-nums ${e.points < 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {e.points >= 0 ? "+" : ""}
                    {e.points}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
