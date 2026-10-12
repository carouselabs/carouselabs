// The admin subscriptions overview's display: the counts as a ledger, the
// export, and every subscription in one table. The page loads the rows.
import Link from "next/link"
import { PlanBadge } from "@/components/admin/ui"
import { tableCls } from "@/components/admin/tableStyles"
import { SubscriptionsExportButton } from "@/components/admin/SubscriptionsExportButton"

// fmtDate lives in components/admin/ui.tsx, which is a "use client" module —
// every export of a client module becomes a client reference, so calling it
// as a plain function from a server component throws. Kept as a local,
// dependency-free formatter instead.
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Never"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-success bg-success/10",
  TRIALING: "text-chart-4 bg-chart-4/10",
  PAST_DUE: "text-warning bg-warning/10",
  CANCELLED: "text-danger bg-danger/10",
  EXPIRED: "text-muted-foreground bg-surface-raised",
}

export interface SubscriptionRow {
  id: string
  plan: string
  status: string
  creditsUsed: number
  creditsTotal: number
  extraCredits: number
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  lsSubscriptionId: string | null
  razorpaySubId: string | null
  user: { id: string; email: string }
}

export function SubscriptionsView({ subs }: { subs: SubscriptionRow[] }) {
  const pro = subs.filter((s) => s.plan === "PRO")
  const growth = subs.filter((s) => s.plan === "GROWTH")
  const paid = subs.filter((s) => s.plan !== "FREE")
  const active = paid.filter((s) => s.status === "ACTIVE")
  const cancelling = paid.filter((s) => s.cancelAtPeriodEnd)
  const pastDue = paid.filter((s) => s.status === "PAST_DUE")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-y border-border py-6 lg:flex-row lg:items-end lg:justify-between">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-10">
          {[
            { label: "Pro Subscriptions", value: pro.length },
            { label: "Growth Subscriptions", value: growth.length },
            { label: "Active", value: active.length },
            { label: "Cancelling at period end", value: cancelling.length },
            { label: "Past Due", value: pastDue.length },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1 border-l border-border pl-4">
              <dt className="text-caption font-medium text-muted-foreground">{f.label}</dt>
              <dd className="text-title-sm leading-none font-semibold tracking-[-0.02em] text-foreground tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="shrink-0">
        <SubscriptionsExportButton
          rows={subs.map((s) => ({
            email: s.user.email,
            plan: s.plan,
            status: s.status,
            creditsUsed: s.creditsUsed,
            creditsTotal: s.creditsTotal,
            extraCredits: s.extraCredits,
            currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
            cancelAtPeriodEnd: s.cancelAtPeriodEnd,
            providerId: s.lsSubscriptionId ?? s.razorpaySubId ?? null,
          }))}
        />
        </div>
      </div>

      <div className={tableCls.wrap}>
        <table className={tableCls.table}>
          <thead>
            <tr>
              <th className={tableCls.th}>User</th>
              <th className={tableCls.th}>Plan</th>
              <th className={tableCls.th}>Status</th>
              <th className={tableCls.th}>Credits</th>
              <th className={tableCls.th}>Period End</th>
              <th className={tableCls.th}>Cancel at end</th>
              <th className={tableCls.th}>Provider ID</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 && (
              <tr>
                <td className={tableCls.td} colSpan={7}>
                  No subscriptions yet
                </td>
              </tr>
            )}
            {subs.map((s) => (
              <tr key={s.id} className={tableCls.row}>
                <td className={tableCls.td}>
                  <Link href={`/admin/users/${s.user.id}`} className="font-medium text-brand underline-offset-4 hover:underline">
                    {s.user.email}
                  </Link>
                </td>
                <td className={tableCls.td}>
                  <PlanBadge plan={s.plan} />
                </td>
                <td className={tableCls.td}>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-caption font-semibold ${STATUS_COLORS[s.status] ?? ""}`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {s.creditsUsed} / {s.creditsTotal}
                  {s.extraCredits > 0 && <span className="text-brand"> +{s.extraCredits}</span>}
                </td>
                <td className={`${tableCls.td} text-muted-foreground tabular-nums`}>{formatDate(s.currentPeriodEnd)}</td>
                <td className={tableCls.td}>{s.cancelAtPeriodEnd ? "Yes" : "—"}</td>
                <td className={`${tableCls.td} text-muted-foreground/80`}>
                  {s.lsSubscriptionId ?? s.razorpaySubId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
