"use client"

// Month view for the intern portal. On sm+ screens this is a 7-column grid
// where each day cell is color-coded by attendance status
// (present/absent/half-day/leave), falling back to a net-points green/red
// when no attendance was recorded; tapping a day with data reveals its task
// pills in a small popover. Below sm, the grid is replaced by a scrollable
// list — a 7-column grid gets too cramped to tap reliably on a phone, and a
// list can show every day's tasks inline with no tap-to-reveal needed at
// all, which sidesteps any hover-only interaction entirely.
import { useState } from "react"

export type AttendanceStatus = "present" | "absent" | "half-day" | "leave"

export type DayCell = {
  day: number | null
  points: number | null
  tasks: string[]
  attendanceStatus: AttendanceStatus | null
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const ATTENDANCE_CELL_STYLES: Record<AttendanceStatus, string> = {
  present: "border-emerald-200 bg-emerald-50",
  absent: "border-red-200 bg-red-50",
  "half-day": "border-amber-200 bg-amber-50",
  leave: "border-blue-200 bg-blue-50",
}

const ATTENDANCE_DOT_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  "half-day": "bg-amber-500",
  leave: "bg-blue-500",
}

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  "half-day": "Half-Day",
  leave: "Leave",
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#F1EFE9] pt-3 text-[11px] text-[#6B7280]">
      <span className="font-medium">Legend:</span>
      {(Object.keys(ATTENDANCE_LABELS) as AttendanceStatus[]).map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${ATTENDANCE_DOT_STYLES[s]}`} />
          {ATTENDANCE_LABELS[s]}
        </span>
      ))}
    </div>
  )
}

// Mobile (< sm): a compact scrollable list, one row per day. Task pills and
// attendance are always visible inline — nothing needs a tap to reveal, so
// there's no hover-only affordance to work around on touch.
function MobileDayList({ cells }: { cells: DayCell[] }) {
  return (
    <ul className="max-h-[420px] divide-y divide-[#F1EFE9] overflow-y-auto sm:hidden">
      {cells.map((c, i) => {
        if (c.day === null) return null
        const hasEntry = c.points !== null && c.points !== 0
        const positive = (c.points ?? 0) > 0
        const weekday = WEEKDAY_LABELS[i % 7]
        return (
          <li key={i} className="flex min-h-[44px] items-start gap-3 py-2.5">
            <div className="flex w-9 shrink-0 flex-col items-center">
              <span className="text-[10px] font-medium uppercase text-[#9CA3AF]">{weekday}</span>
              <span className="text-[15px] font-bold leading-tight text-[#0A0A0A] tabular-nums">{c.day}</span>
            </div>
            <div className="min-w-0 flex-1">
              {c.attendanceStatus || c.tasks.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.attendanceStatus && (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ATTENDANCE_CELL_STYLES[c.attendanceStatus]} text-[#0A0A0A]`}
                    >
                      {ATTENDANCE_LABELS[c.attendanceStatus]}
                    </span>
                  )}
                  {c.tasks.map((t) => (
                    <span
                      key={t}
                      className="inline-flex rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10.5px] font-medium text-[#7C3AED]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[11.5px] text-[#C4C0B8]">No activity</span>
              )}
            </div>
            {hasEntry && (
              <span
                className={`shrink-0 text-[13px] font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}
              >
                {positive ? "+" : ""}
                {c.points}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// Desktop/tablet (sm+): the classic 7-column grid, tap-to-reveal popover.
function DesktopGrid({ cells }: { cells: DayCell[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="hidden sm:block">
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-medium text-[#9CA3AF]">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, i) => {
          if (c.day === null) return <div key={i} />
          const hasEntry = c.points !== null && c.points !== 0
          const positive = (c.points ?? 0) > 0
          const isOpen = openIndex === i
          const canOpen = c.tasks.length > 0 || !!c.attendanceStatus
          const cellStyle = c.attendanceStatus
            ? ATTENDANCE_CELL_STYLES[c.attendanceStatus]
            : hasEntry
              ? positive
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
              : "border-[#F1EFE9] bg-[#F9F7F2]"
          const tooltip = [c.attendanceStatus ? ATTENDANCE_LABELS[c.attendanceStatus] : null, ...c.tasks]
            .filter(Boolean)
            .join(", ")
          // Center the popover under most cells, but pin it to the inner
          // edge for the first/last column so it can't overflow the card.
          const col = i % 7
          const popoverAlign = col === 0 ? "left-0" : col === 6 ? "right-0" : "left-1/2 -translate-x-1/2"
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => canOpen && setOpenIndex(isOpen ? null : i)}
                title={tooltip || undefined}
                className={`aspect-square w-full min-h-11 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-shadow ${cellStyle} ${
                  canOpen ? "cursor-pointer hover:shadow-sm" : "cursor-default"
                } ${isOpen ? "ring-2 ring-[#7C3AED]/40" : ""}`}
              >
                <span className="text-[11px] font-medium text-[#6B7280]">{c.day}</span>
                {hasEntry && (
                  <span
                    className={`text-[11px] font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {positive ? "+" : ""}
                    {c.points}
                  </span>
                )}
              </button>
              {isOpen && canOpen && (
                <div
                  className={`absolute z-20 top-full ${popoverAlign} mt-1.5 w-max max-w-[200px] rounded-xl border border-[#E5E3DE] bg-white p-2.5 shadow-lg`}
                >
                  <div className="flex flex-wrap gap-1">
                    {c.attendanceStatus && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ATTENDANCE_CELL_STYLES[c.attendanceStatus]} text-[#0A0A0A]`}
                      >
                        {ATTENDANCE_LABELS[c.attendanceStatus]}
                      </span>
                    )}
                    {c.tasks.map((t) => (
                      <span
                        key={t}
                        className="inline-flex rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10.5px] font-medium text-[#7C3AED]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PerformanceCalendar({ cells, monthLabel }: { cells: DayCell[]; monthLabel: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E3DE] bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-[13px] font-semibold text-[#0A0A0A]">{monthLabel}</h2>
      <MobileDayList cells={cells} />
      <DesktopGrid cells={cells} />
      <Legend />
    </div>
  )
}
