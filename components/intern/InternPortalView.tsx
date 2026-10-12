// The intern portal's display: profile and timeline, the score, the month,
// recent entries, and the side column (leaderboard, leave, support). The page
// loads and computes everything; this only lays it out.
import { cn } from "@/lib/utils"
import { formatExtensionAmount } from "@/lib/internPoints"
import { PerformanceCalendar, type DayCell } from "@/components/intern/PerformanceCalendar"
import { LeaveApplication } from "@/components/intern/LeaveApplication"
import { SupportChat } from "@/components/intern/SupportChat"
import { LeaderboardCard } from "@/components/intern/LeaderboardCard"

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: "bg-success-soft text-success",
  extended: "bg-success-soft text-success",
  completed: "bg-chart-4/10 text-chart-4",
  terminated: "bg-danger-soft text-danger",
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export interface InternPortalProps {
  intern: {
    id: string
    name: string
    status: string
    role: string | null
    department: string | null
    email: string
    phone: string | null
    joinDate: Date
    extensions: { id: string; addedDays: number; createdAt: Date }[]
  }
  endDate: Date
  progress: { percentComplete: number; daysRemaining: number; isCompleted: boolean }
  hasEnded: boolean
  total: number
  pointsToday: number
  pointsThisWeek: number
  attendanceRateLabel: string
  leaveBalance: { remaining: number; total: number }
  takenDates: string[]
  cells: DayCell[]
  monthLabel: string
  recent: { id: string; category: string; note: string | null; date: Date; points: number }[]
  taskNames: Set<string>
}

export function InternPortalView({
  intern,
  endDate,
  progress,
  hasEnded,
  total,
  pointsToday,
  pointsThisWeek,
  attendanceRateLabel,
  leaveBalance,
  takenDates,
  cells,
  monthLabel,
  recent,
  taskNames,
}: InternPortalProps) {
  // The small figures that sit beside the total.
  const ledger = [
    { label: "This Week", value: pointsThisWeek },
    { label: "Today", value: pointsToday },
    { label: "Attendance Rate", value: attendanceRateLabel },
    { label: "Leave Balance", value: `${leaveBalance.remaining}/${leaveBalance.total}` },
  ]

  return (
    <div className="mx-auto flex w-full max-w-showcase flex-col gap-8">
      <h1 className="text-title-sm font-semibold text-foreground sm:text-title">Your Performance</h1>

      {/* Who, and how far along — profile and internship timeline in one band */}
      <section aria-label={intern.name} className="rounded-showcase border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-title-sm font-semibold text-brand">
            {intern.name[0]?.toUpperCase()}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lead font-semibold text-foreground">{intern.name}</h2>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap capitalize",
                  STATUS_BADGE_STYLES[intern.status] ?? "bg-surface-muted text-muted-foreground"
                )}
              >
                {intern.status}
              </span>
            </div>
            <p className="text-label text-muted-foreground">
              {[intern.role, intern.department].filter(Boolean).join(" · ") || "No role/department set"}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-8 gap-y-2 border-t border-border pt-5 text-label sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex min-w-0 gap-1.5">
            <dt className="font-medium text-foreground">Email:</dt>
            <dd className="truncate text-muted-foreground">{intern.email}</dd>
          </div>
          {intern.phone && (
            <div className="flex gap-1.5">
              <dt className="font-medium text-foreground">Phone:</dt>
              <dd className="text-muted-foreground">{intern.phone}</dd>
            </div>
          )}
          <div className="flex gap-1.5">
            <dt className="font-medium text-foreground">Internship:</dt>
            <dd className="text-muted-foreground">
              {fmtDate(intern.joinDate)} → {fmtDate(endDate)}
            </dd>
          </div>
        </dl>

        {intern.extensions.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {intern.extensions.map((x) => (
              <p key={x.id} className="text-caption text-muted-foreground">
                {x.addedDays >= 0 ? "Extended" : "Reduced"} by {formatExtensionAmount(x.addedDays)} on{" "}
                {fmtDate(x.createdAt)}
              </p>
            ))}
          </div>
        )}

        {/* Internship progress */}
        <div className="mt-5 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
            <span>
              {fmtDate(intern.joinDate)} → {fmtDate(endDate)}
            </span>
            <span className="font-medium text-foreground">
              {progress.isCompleted
                ? "Internship period ended"
                : `${progress.daysRemaining} day${progress.daysRemaining === 1 ? "" : "s"} remaining`}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percentComplete}
            aria-label={`${progress.percentComplete}% complete`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
          >
            <div
              className={cn("h-full rounded-full", progress.isCompleted ? "bg-muted-foreground" : "bg-brand")}
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
          <div className="text-right text-caption text-muted-foreground tabular-nums">{progress.percentComplete}% complete</div>
        </div>
      </section>

      {hasEnded && (
        <div role="status" className="rounded-card border border-border bg-surface-muted p-4 text-label font-medium text-foreground">
          Your internship has ended on {fmtDate(endDate)}. You can still view your history below, but new leave
          applications are no longer available.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          {/* The score: one big number, the rest as a quiet ledger beside it */}
          <section aria-label="Total Points" className="grid gap-6 border-y border-foreground/80 py-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-10">
            <div className="flex flex-col gap-1">
              <span className="text-label font-medium text-muted-foreground">Total Points</span>
              <span className="font-display text-[4.5rem] leading-[0.85] tracking-[-0.03em] text-foreground tabular-nums sm:text-[6rem]">
                {total}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {ledger.map((item) => (
                <div key={item.label} className="flex flex-col gap-1 border-l border-border pl-3">
                  <dt className="text-caption font-medium text-muted-foreground">{item.label}</dt>
                  <dd className="text-lead font-semibold text-foreground tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Calendar */}
          <PerformanceCalendar cells={cells} monthLabel={monthLabel} />

          {/* Recent entries */}
          <section className="flex flex-col">
            <h2 className="border-b border-foreground/80 pb-2.5 text-body font-semibold text-foreground">Recent Entries</h2>
            {recent.length === 0 ? (
              <p className="py-4 text-label text-muted-foreground">No entries yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-label font-medium text-foreground">{e.category}</span>
                        {taskNames.has(e.category) ? (
                          <span className="inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                            TASK
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      {e.note && <span className="truncate text-caption text-muted-foreground">{e.note}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className="text-caption text-muted-foreground">{fmtDate(e.date)}</span>
                      <span
                        className={cn(
                          "w-12 text-right text-label font-bold tabular-nums",
                          e.points < 0 ? "text-danger" : "text-success"
                        )}
                      >
                        {e.points >= 0 ? "+" : ""}
                        {e.points}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side column: standing, time off, and help */}
        <div className="flex min-w-0 flex-col gap-6">
          <LeaderboardCard internId={intern.id} />

          {/* Apply for Leave — read-only once the internship has ended */}
          {hasEnded ? (
            <section className="rounded-card border border-border bg-surface p-5">
              <h2 className="mb-1 text-body font-semibold text-foreground">Leave</h2>
              <p className="text-label text-muted-foreground">
                Leave applications are closed now that your internship has ended. Your past leave history is still
                shown in the calendar below.
              </p>
            </section>
          ) : (
            <LeaveApplication remaining={leaveBalance.remaining} total={leaveBalance.total} takenDates={takenDates} />
          )}

          <SupportChat />
        </div>
      </div>
    </div>
  )
}
