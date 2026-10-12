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
  present: "border-success/30 bg-success-soft",
  absent: "border-danger/30 bg-danger-soft",
  "half-day": "border-warning/30 bg-warning-soft",
  leave: "border-chart-4/30 bg-chart-4/10",
}

const ATTENDANCE_DOT_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-success",
  absent: "bg-danger",
  "half-day": "bg-warning",
  leave: "bg-chart-4",
}

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  "half-day": "Half-Day",
  leave: "Leave",
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-caption text-muted-foreground">
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
    <ul className="max-h-[420px] divide-y divide-border overflow-y-auto sm:hidden">
      {cells.map((c, i) => {
        if (c.day === null) return null
        const hasEntry = c.points !== null && c.points !== 0
        const positive = (c.points ?? 0) > 0
        const weekday = WEEKDAY_LABELS[i % 7]
        return (
          <li key={i} className="flex min-h-[44px] items-start gap-3 py-2.5">
            <div className="flex w-9 shrink-0 flex-col items-center">
              <span className="text-[11px] font-medium text-muted-foreground">{weekday}</span>
              <span className="text-body font-bold leading-tight text-foreground tabular-nums">{c.day}</span>
            </div>
            <div className="min-w-0 flex-1">
              {c.attendanceStatus || c.tasks.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.attendanceStatus && (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${ATTENDANCE_CELL_STYLES[c.attendanceStatus]} text-foreground`}
                    >
                      {ATTENDANCE_LABELS[c.attendanceStatus]}
                    </span>
                  )}
                  {c.tasks.map((t) => (
                    <span
                      key={t}
                      className="inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-caption text-muted-foreground/70">No activity</span>
              )}
            </div>
            {hasEntry && (
              <span
                className={`shrink-0 text-label font-bold tabular-nums ${positive ? "text-success" : "text-danger"}`}
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
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-caption font-medium text-muted-foreground">
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
                ? "border-success/30 bg-success-soft"
                : "border-danger/30 bg-danger-soft"
              : "border-border bg-background"
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
                className={`h-14 w-full rounded-control-sm lg:h-16 border flex flex-col items-center justify-center gap-0.5 transition-shadow ${cellStyle} ${
                  canOpen ? "cursor-pointer hover:shadow-card" : "cursor-default"
                } ${isOpen ? "ring-2 ring-brand/40" : ""}`}
              >
                <span className="text-caption font-medium text-muted-foreground">{c.day}</span>
                {hasEntry && (
                  <span
                    className={`text-caption font-bold tabular-nums ${positive ? "text-success" : "text-danger"}`}
                  >
                    {positive ? "+" : ""}
                    {c.points}
                  </span>
                )}
              </button>
              {isOpen && canOpen && (
                <div
                  className={`absolute z-20 top-full ${popoverAlign} mt-1.5 w-max max-w-[200px] rounded-control border border-border bg-surface-raised p-2.5 shadow-popover`}
                >
                  <div className="flex flex-wrap gap-1">
                    {c.attendanceStatus && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${ATTENDANCE_CELL_STYLES[c.attendanceStatus]} text-foreground`}
                      >
                        {ATTENDANCE_LABELS[c.attendanceStatus]}
                      </span>
                    )}
                    {c.tasks.map((t) => (
                      <span
                        key={t}
                        className="inline-flex rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
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
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="mb-4 font-display text-title-sm leading-none text-foreground">{monthLabel}</h2>
      <MobileDayList cells={cells} />
      <DesktopGrid cells={cells} />
      <Legend />
    </section>
  )
}
