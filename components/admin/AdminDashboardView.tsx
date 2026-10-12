// The admin overview's display: who the users are (total + plan mix), what
// they've made and what it cost, quick actions, and recent activity. The page
// loads the numbers (lib/adminStats.ts getOverviewStats); this only lays them out.
import Link from "next/link"
import type { OverviewStats } from "@/lib/adminStats"
import { PlanBadge } from "@/components/admin/ui"
import { tableCls } from "@/components/admin/tableStyles"
import { QuickActions } from "@/components/admin/QuickActions"

// fmtDate/fmtDateTime live in components/admin/ui.tsx, which is a "use
// client" module — every export of a client module becomes a client
// reference, so calling them as plain functions from a server component
// throws. Kept as local, dependency-free formatters instead.
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Never"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "Never"
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// Plan mix colours, checked for the dark chart surface (lightness band,
// chroma, colour-blind separation, 3:1 contrast). Chart-only: text stays in
// the text tokens.
const PLAN_MIX = [
  { key: "pro", label: "Pro Users", color: "#8B5CF6" },
  { key: "growth", label: "Growth Users", color: "#D97706" },
  { key: "free", label: "Free Users", color: "#0F9F8F" },
] as const

function percent(part: number, whole: number): string {
  if (whole <= 0) return "0%"
  const p = (part / whole) * 100
  return `${p > 0 && p < 1 ? "<1" : Math.round(p)}%`
}

export function AdminDashboardView({ s }: { s: OverviewStats }) {
  const counts = { pro: s.proUsers, growth: s.growthUsers, free: s.freeUsers }
  const mixTotal = s.proUsers + s.growthUsers + s.freeUsers

  const ledger = [
    { label: "Total Posts", value: s.totalPosts.toLocaleString() },
    { label: "Carousels", value: s.totalCarousels.toLocaleString() },
    { label: "Images", value: s.totalImages.toLocaleString() },
    { label: "Credits Used", value: s.totalCreditsUsed.toLocaleString() },
    { label: "Est. API Cost", value: `$${s.estApiCost.toFixed(2)}`, hint: "credits used × $0.025" },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Users: the one big number, and how they split across plans */}
      <section
        aria-label="Total Users"
        className="grid gap-8 rounded-showcase border border-border bg-surface p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-14"
      >
        <div className="flex flex-col gap-1">
          <span className="text-label font-medium text-muted-foreground">Total Users</span>
          <span className="font-display text-[4.5rem] leading-[0.85] tracking-[-0.03em] text-foreground tabular-nums sm:text-[6rem]">
            {s.totalUsers.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Plan mix: one bar, a 2px surface gap between segments, each segment hoverable */}
          <div className="flex h-3 w-full gap-0.5" role="img" aria-label={PLAN_MIX.map((p) => `${p.label}: ${counts[p.key]}`).join(", ")}>
            {PLAN_MIX.map((p) =>
              counts[p.key] > 0 ? (
                <span
                  key={p.key}
                  title={`${p.label}: ${counts[p.key].toLocaleString()} (${percent(counts[p.key], mixTotal)})`}
                  className="h-full min-w-1 first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity duration-(--motion-fast) hover:opacity-80"
                  style={{ flexGrow: counts[p.key], flexBasis: 0, backgroundColor: p.color }}
                />
              ) : null
            )}
            {mixTotal === 0 && <span className="h-full flex-1 rounded-[4px] bg-surface-raised" />}
          </div>
          {/* Legend doubles as the table view: label, count, share */}
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-3">
            {PLAN_MIX.map((p) => (
              <div key={p.key} className="flex flex-col gap-0.5">
                <dt className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
                  <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: p.color }} />
                  {p.label}
                </dt>
                <dd className="flex items-baseline gap-2">
                  <span className="text-title-sm leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                    {counts[p.key].toLocaleString()}
                  </span>
                  <span className="text-caption text-muted-foreground tabular-nums">{percent(counts[p.key], mixTotal)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* What users made and what it cost — a quiet ledger */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-6 sm:grid-cols-3 lg:grid-cols-5">
        {ledger.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 border-l border-border pl-4">
            <dt className="text-caption font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-lead font-semibold text-foreground tabular-nums">{item.value}</dd>
            {item.hint && <dd className="text-caption text-muted-foreground/80">{item.hint}</dd>}
          </div>
        ))}
      </dl>

      <QuickActions />

      {/* Recent activity */}
      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="recent-signups" className="flex min-w-0 flex-col gap-3">
          <h2 id="recent-signups" className="text-label font-semibold text-foreground">
            Recent Signups
          </h2>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Email</th>
                  <th className={tableCls.th}>Plan</th>
                  <th className={tableCls.th}>Signed up</th>
                </tr>
              </thead>
              <tbody>
                {s.recentUsers.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={3}>
                      No users yet
                    </td>
                  </tr>
                )}
                {s.recentUsers.map((u) => (
                  <tr key={u.id} className={tableCls.row}>
                    <td className={tableCls.td}>
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-brand underline-offset-4 hover:underline">
                        {u.email}
                      </Link>
                      {u.name && <span className="ml-2 text-muted-foreground/80">{u.name}</span>}
                    </td>
                    <td className={tableCls.td}>
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className={`${tableCls.td} text-muted-foreground tabular-nums`}>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="recent-posts" className="flex min-w-0 flex-col gap-3">
          <h2 id="recent-posts" className="text-label font-semibold text-foreground">
            Recent Posts
          </h2>
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>User</th>
                  <th className={tableCls.th}>Type</th>
                  <th className={tableCls.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {s.recentPosts.length === 0 && (
                  <tr>
                    <td className={tableCls.td} colSpan={3}>
                      No posts yet
                    </td>
                  </tr>
                )}
                {s.recentPosts.map((p) => (
                  <tr key={p.id} className={tableCls.row}>
                    <td className={tableCls.td}>{p.email}</td>
                    <td className={tableCls.td}>
                      <span className="text-muted-foreground">{p.format.replace("_", " ")}</span>
                    </td>
                    <td className={`${tableCls.td} text-muted-foreground tabular-nums`}>{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
