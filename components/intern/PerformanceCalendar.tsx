"use client"

// Month calendar for the intern portal. Each day cell is color-coded by net
// points; clicking (or hovering, via the native `title` tooltip) a day that
// has entries reveals which tasks were completed that day as pills.
import { useState } from "react"

export type DayCell = { day: number | null; points: number | null; tasks: string[] }

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
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => c.tasks.length > 0 && setOpenIndex(isOpen ? null : i)}
                title={c.tasks.length > 0 ? c.tasks.join(", ") : undefined}
                className={`aspect-square w-full rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-shadow ${
                  hasEntry
                    ? positive
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                    : "border-[#F1EFE9] bg-[#F9F7F2]"
                } ${c.tasks.length > 0 ? "cursor-pointer hover:shadow-sm" : "cursor-default"} ${isOpen ? "ring-2 ring-[#7C3AED]/40" : ""}`}
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
              {isOpen && c.tasks.length > 0 && (
                <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1.5 w-max max-w-[200px] rounded-xl border border-[#E5E3DE] bg-white p-2.5 shadow-lg">
                  <div className="flex flex-wrap gap-1">
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
