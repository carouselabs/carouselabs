"use client"

// Pieces of the Email report (EmailReport.tsx, CampaignActivity.tsx): a
// ranked bar list (one series: no legend, the value beside each bar in text
// ink) and the "when people read" grid (one hue, light to dark, with the
// count on hover and the busiest times written out).
import { CHART_COLORS } from "@/components/admin/charts"

export function BarList({
  rows,
  unit,
  empty,
}: {
  rows: { label: string; value: number; title?: string; note?: string }[]
  unit: (n: number) => string
  empty: string
}) {
  if (rows.length === 0) return <p className="text-caption text-muted-foreground">{empty}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1" aria-label={`${r.label}: ${unit(r.value)}`} title={r.title}>
          <span className="flex items-baseline justify-between gap-3 text-caption">
            <span className="truncate text-foreground">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {unit(r.value)}
              {r.note ? ` · ${r.note}` : ""}
            </span>
          </span>
          <span className="block h-2 rounded-full bg-surface-muted">
            <span className="block h-2 rounded-full" style={{ width: `${Math.max(4, (r.value / max) * 100)}%`, backgroundColor: CHART_COLORS.violet }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`
// The violet of the admin charts, lighter for fewer: one hue, light to dark.
const shade = (share: number) => `rgba(139, 92, 246, ${0.18 + 0.82 * share})`

/** grid[weekday Monday..Sunday][hour 0..23]: people's opens and clicks. */
export function ReadingHeatmap({ grid }: { grid: number[][] }) {
  const cells = grid.flatMap((hours, d) => hours.map((n, h) => ({ d, h, n })))
  const max = Math.max(...cells.map((c) => c.n), 0)
  if (max === 0) return <p className="text-caption text-muted-foreground">Nothing yet: this fills in as people open and click.</p>
  const busiest = cells
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((c) => `${DAYS[c.d]} ${hourLabel(c.h)}–${hourLabel((c.h + 1) % 24)}`)
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="grid min-w-[30rem] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[2px]" role="table" aria-label="Opens and clicks by weekday and hour">
          <span role="columnheader" />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} role="columnheader" className="text-center text-[10px] text-muted-foreground">
              {h % 6 === 0 ? hourLabel(h) : ""}
            </span>
          ))}
          {grid.map((hours, d) => (
            <div key={d} role="row" className="contents">
              <span role="rowheader" className="pr-1 text-right text-[11px] leading-5 text-muted-foreground">
                {DAYS[d]}
              </span>
              {hours.map((n, h) => (
                <span
                  key={h}
                  role="cell"
                  title={`${DAYS[d]} ${hourLabel(h)}–${hourLabel((h + 1) % 24)}: ${n}`}
                  aria-label={`${DAYS[d]} ${hourLabel(h)}: ${n}`}
                  className="h-5 rounded-[3px]"
                  style={{ backgroundColor: n === 0 ? "var(--color-surface-muted, #2A2622)" : shade(n / max) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-muted-foreground">
        <span>
          Busiest: <span className="text-foreground">{busiest.join(", ")}</span>
        </span>
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          Fewer
          {[0.15, 0.4, 0.7, 1].map((s) => (
            <span key={s} className="inline-block size-3 rounded-[3px]" style={{ backgroundColor: shade(s) }} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
