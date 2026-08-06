"use client"

// Month calendar for the intern portal. Each day cell is color-coded by
// attendance status (present/absent/half-day/leave) when one was recorded,
// falling back to a net-points green/red when it wasn't. Clicking (or
// hovering, via the native `title` tooltip) a day that has entries reveals
// which tasks were completed that day as pills.
import { useState } from "react"

export type AttendanceStatus = "present" | "absent" | "half-day" | "leave"

export type DayCell = {
  day: number | null
  points: number | null
  tasks: string[]
  attendanceStatus: AttendanceStatus | null
}

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

export function PerformanceCalendar({ cells, monthLabel }: { cells: DayCell[]; monthLabel: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="rounded-2xl border border-[#E5E3DE] bg-white p-5">
      <h2 className="mb-4 text-[13px] font-semibold text-[#0A0A0A]">{monthLabel}</h2>
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-medium text-[#9CA3AF]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
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
          const tooltip = [
            c.attendanceStatus ? ATTENDANCE_LABELS[c.attendanceStatus] : null,
            ...c.tasks,
          ]
            .filter(Boolean)
            .join(", ")
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => canOpen && setOpenIndex(isOpen ? null : i)}
                title={tooltip || undefined}
                className={`aspect-square w-full rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-shadow ${cellStyle} ${
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
                <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1.5 w-max max-w-[200px] rounded-xl border border-[#E5E3DE] bg-white p-2.5 shadow-lg">
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
      <Legend />
    </div>
  )
}
