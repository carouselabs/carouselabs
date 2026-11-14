"use client"

// components/extension/ActivityHeatmap.tsx — Engage → Activity's "comments
// per day" grid, like GitHub's: one box a day for the last 13 weeks (history
// is kept for 90 days), darker for more, in five shades measured against the
// busiest day of each day's own month, which is always the darkest
// (lib/engage/heatmap.ts). Beside it, this
// month's total, busiest day and days active. Counts come from
// app/api/ext/activity in the browser's own time zone, so a day is the
// person's day. X counts replies (it has no comments).
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import type { EngagePlatform } from "@/lib/engage/features"
import { HEAT_SHADES, busiestByMonth, heatLevel, heatWeeks, localDayKey, monthSummary } from "@/lib/engage/heatmap"
import { extApi, errorMessage } from "./api"

const WEEKS = 13
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]
// What each shade means, measured against the month's busiest day.
const LEGEND_TITLES = [
  "None",
  "Up to a quarter of the month's busiest day",
  "Up to half of it",
  "Up to three quarters of it",
  "The month's busiest days",
]

interface ActivityResponse {
  timeZone: string
  one: string
  many: string
  days: { day: string; count: number }[]
}

// "Today" is the browser's, read once per page load: the server's clock and
// zone would draw the wrong days, so the grid waits for the browser.
let browserToday: Date | null = null
const readToday = () => (browserToday ??= new Date())
const noSubscribe = () => () => {}

const dayTitle = (date: Date) => date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
const shortDay = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

export function ActivityHeatmap({
  platform,
  initial,
  today: todayOverride,
}: {
  platform: EngagePlatform
  /** Development previews only: the answer to show instead of asking the server. */
  initial?: ActivityResponse
  today?: Date
}) {
  const [data, setData] = useState<ActivityResponse | null>(initial ?? null)
  const [error, setError] = useState<string | null>(null)
  const clientToday = useSyncExternalStore(noSubscribe, readToday, () => null)
  const today = todayOverride ?? clientToday

  useEffect(() => {
    if (initial) return
    let live = true
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    extApi<ActivityResponse>(`/api/ext/activity?platform=${platform}&days=91&tz=${encodeURIComponent(tz)}`)
      .then((res) => live && setData(res))
      .catch((err) => live && setError(errorMessage(err)))
    return () => {
      live = false
    }
  }, [platform, initial])

  const counts = useMemo(() => new Map((data?.days ?? []).map((d) => [d.day, d.count])), [data])
  const busiest = useMemo(() => busiestByMonth(counts), [counts])

  if (!today) {
    return <section aria-busy className="h-[17rem] animate-pulse rounded-card bg-surface-raised shadow-card" />
  }

  const weeks = heatWeeks(today, WEEKS)
  const summary = monthSummary(counts, today)
  const many = data?.many ?? (platform === "x" ? "replies" : "comments")
  const one = data?.one ?? (platform === "x" ? "reply" : "comment")
  const monthName = today.toLocaleDateString("en-GB", { month: "long" })
  const plural = (n: number) => `${n} ${n === 1 ? one : many}`

  // Month names over the week each month starts in.
  const monthLabels = weeks.map((col, i) => {
    const firstOfMonth = col.find((c) => c.date.getDate() === 1)
    if (firstOfMonth) return firstOfMonth.date.toLocaleDateString("en-GB", { month: "short" })
    return i === 0 ? col[0].date.toLocaleDateString("en-GB", { month: "short" }) : ""
  })
  const todayKey = localDayKey(today)

  return (
    <section
      aria-labelledby="engage-days-title"
      className="flex flex-wrap items-start gap-7 rounded-card bg-surface-raised p-6 shadow-card"
    >
      <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-3.5">
        <h2 id="engage-days-title" className="text-caption font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          This month · {monthName}
        </h2>
        <p className="flex flex-col">
          <span className="text-[3.5rem] leading-none font-semibold tracking-[-0.045em] text-foreground tabular-nums">
            {data ? summary.total : "–"}
          </span>
          <span className="engage-serif text-[1.6rem] text-brand">{many}</span>
        </p>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-caption text-muted-foreground">Busiest day</dt>
            <dd className="mt-0.5 text-body font-semibold text-foreground">
              {summary.best ? `${summary.best.count} · ${shortDay(summary.best.key)}` : "–"}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">Days active</dt>
            <dd className="mt-0.5 text-body font-semibold text-foreground">
              {summary.activeDays} of {summary.daysSoFar}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex min-w-0 flex-[999_1_30rem] flex-col gap-3">
        <div className="no-scrollbar overflow-x-auto pb-1">
          <div
            role="img"
            aria-label={
              data
                ? `${plural(summary.total)} in ${monthName}${summary.best ? `, busiest day ${shortDay(summary.best.key)} with ${summary.best.count}` : ""}. Each box is a day over the last ${WEEKS} weeks, darker for more, the darkest being each month's busiest day.`
                : `${many} per day, loading`
            }
            className="inline-flex flex-col gap-1.5"
          >
            <div aria-hidden className="flex gap-[5px] pl-9">
              {monthLabels.map((label, i) => (
                <span key={i} className="w-5 shrink-0 overflow-visible text-caption whitespace-nowrap text-muted-foreground lg:w-6">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex gap-[5px]">
              <div aria-hidden className="grid w-8 shrink-0 grid-rows-7 gap-[5px] text-[11px] text-muted-foreground">
                {DAY_LABELS.map((d, i) => (
                  <span key={i} className="flex h-5 items-center lg:h-6">
                    {d}
                  </span>
                ))}
              </div>
              {weeks.map((col, w) => (
                <div key={w} className="flex flex-col gap-[5px]">
                  {col.map((cell) => {
                    const count = counts.get(cell.key) ?? 0
                    return cell.future ? (
                      <span key={cell.key} aria-hidden className="size-5 lg:size-6" />
                    ) : (
                      <span
                        key={cell.key}
                        title={`${dayTitle(cell.date)}: ${data ? plural(count) : "…"}`}
                        className={`block size-5 rounded-[6px] lg:size-6 ${data ? "" : "animate-pulse"} ${
                          cell.key === todayKey ? "ring-2 ring-foreground ring-offset-2 ring-offset-surface-raised" : ""
                        }`}
                        style={{ backgroundColor: HEAT_SHADES[data ? heatLevel(count, busiest.get(cell.key.slice(0, 7)) ?? 0) : 0] }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 pl-9">
          <span className="text-caption text-muted-foreground">
            {error ? `Couldn't load the days: ${error}` : "Hover a box for the day."}
          </span>
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
            Less
            {HEAT_SHADES.map((shade, i) => (
              <span
                key={shade}
                title={LEGEND_TITLES[i]}
                className="block size-4.5 rounded-[5px]"
                style={{ backgroundColor: shade }}
              />
            ))}
            More
            <span className="ml-1.5">Darkest: each month&apos;s busiest day</span>
          </span>
        </div>
      </div>
    </section>
  )
}
