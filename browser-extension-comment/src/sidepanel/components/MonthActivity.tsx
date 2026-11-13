import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PLATFORM } from "@/lib/platform";
import { HEAT_RANGES, heatLevel, localDayKey, monthCells, monthSummary } from "@/lib/heatmap";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityResponse {
  one: string;
  many: string;
  days: { day: string; count: number }[];
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const shortDay = (date: Date) => `${date.getDate()} ${date.toLocaleDateString("en-GB", { month: "short" })}`;
const fromKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Profile's "comments per day" for this month (X: replies), like GitHub's
// contribution boxes: one box a day, darker for more, in five shades
// (--heat-0…4 in the theme). Tap a day to see its count. Counts come from
// app/api/ext/activity, in this browser's time zone.
export function MonthActivity({ today: todayOverride }: { today?: Date } = {}) {
  const [today] = useState(() => todayOverride ?? new Date());
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState(() => localDayKey(today));

  useEffect(() => {
    let live = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    apiFetch<ActivityResponse>(`/api/ext/activity?platform=${PLATFORM}&days=${today.getDate()}&tz=${encodeURIComponent(tz)}`)
      .then((res) => live && setData(res))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [today]);

  const counts = useMemo(() => new Map((data?.days ?? []).map((d) => [d.day, d.count])), [data]);
  const cells = useMemo(() => monthCells(today), [today]);
  const summary = monthSummary(counts, today);
  const one = data?.one ?? (PLATFORM === "x" ? "reply" : "comment");
  const many = data?.many ?? (PLATFORM === "x" ? "replies" : "comments");
  const plural = (n: number) => `${n} ${n === 1 ? one : many}`;
  const monthName = today.toLocaleDateString("en-GB", { month: "long" });
  const todayKey = localDayKey(today);
  const pickedDate = fromKey(picked);

  return (
    <section aria-labelledby="month-activity-title" className="space-y-2.5 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h2 id="month-activity-title" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            This month · {monthName}
          </h2>
          <p className="flex items-baseline gap-2">
            {data ? (
              <span className="text-4xl font-semibold leading-none tracking-[-0.04em] tabular-nums">{summary.total}</span>
            ) : (
              <Skeleton className="h-10 w-14" />
            )}
            <span className="font-serif-display text-xl text-primary-text">{many}</span>
          </p>
        </div>
        <dl className="shrink-0 space-y-1.5 text-right">
          <div>
            <dt className="text-[11px] text-muted-foreground">Best day</dt>
            <dd className="text-sm font-semibold">
              {summary.best ? `${summary.best.count} on ${shortDay(fromKey(summary.best.key))}` : "–"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Days active</dt>
            <dd className="text-sm font-semibold">
              {summary.activeDays} of {summary.daysSoFar}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span key={i} aria-hidden className="text-center text-[11px] font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <span key={`blank-${i}`} aria-hidden />;
          const count = counts.get(cell.key) ?? 0;
          const level = data ? heatLevel(count) : 0;
          const name = `${WEEKDAY_NAMES[cell.date.getDay()]} ${shortDay(cell.date)}`;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.future}
              aria-pressed={cell.key === picked}
              aria-label={cell.future ? `${name}, still to come` : `${name}: ${data ? plural(count) : "loading"}`}
              title={cell.future ? undefined : `${name}: ${plural(count)}`}
              onClick={() => setPicked(cell.key)}
              className={cn(
                "flex aspect-square w-full items-start justify-start rounded-[7px] pl-1 pt-0.5 text-[10px] font-semibold transition-[box-shadow,transform] duration-fast ease-out",
                cell.future
                  ? "border-[1.5px] border-dashed border-border text-muted-foreground"
                  : "active:scale-95",
                !data && !cell.future && "animate-pulse",
                cell.key === picked && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
              style={
                cell.future
                  ? undefined
                  : { backgroundColor: `var(--heat-${level})`, color: `var(--heat-ink-${level})` }
              }
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="flex justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-xs">
        <span className="font-semibold">
          {WEEKDAY_NAMES[pickedDate.getDay()]} {shortDay(pickedDate)}
          {picked === todayKey ? " · today" : ""}
        </span>
        <span className="text-muted-foreground">
          {failed ? "Couldn't load this month" : data ? plural(counts.get(picked) ?? 0) : "Loading…"}
        </span>
      </p>

      <div className="flex items-end justify-between gap-2">
        <div role="group" className="flex items-end gap-1.5" aria-label="Shades, from none to the most">
          <span className="pb-3.5 text-[11px] text-muted-foreground">Less</span>
          {HEAT_RANGES.map((range, level) => (
            <span key={range} className="flex flex-col items-center gap-0.5">
              <span aria-hidden className="h-4 w-4 rounded-[5px]" style={{ backgroundColor: `var(--heat-${level})` }} />
              <span className="text-[10px] text-muted-foreground">{range}</span>
            </span>
          ))}
          <span className="pb-3.5 text-[11px] text-muted-foreground">More</span>
        </div>
      </div>
    </section>
  );
}
