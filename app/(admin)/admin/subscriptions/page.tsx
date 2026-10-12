// /admin/subscriptions — billing overview (server-rendered from Prisma).
import Link from "next/link"
import { db } from "@/lib/db"
import { PlanBadge, StatCard, tableCls } from "@/components/admin/ui"
import { SubscriptionsExportButton } from "@/components/admin/SubscriptionsExportButton"

export const dynamic = "force-dynamic"

// fmtDate lives in components/admin/ui.tsx, which is a "use client" module —
// every export of a client module becomes a client reference, so calling it
// as a plain function from this server component throws. Kept as a local,
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
  ACTIVE: "text-emerald-400 bg-emerald-500/10",
  TRIALING: "text-sky-400 bg-sky-500/10",
  PAST_DUE: "text-amber-400 bg-amber-500/10",
  CANCELLED: "text-red-400 bg-red-500/10",
  EXPIRED: "text-[#8A8A8A] bg-[#2A2A2A]",
}

export default async function AdminSubscriptionsPage() {
  const subs = await db.subscription.findMany({
    where: { user: { deletedAt: null } },
    orderBy: [{ plan: "desc" }, { updatedAt: "desc" }],
    include: { user: { select: { id: true, email: true } } },
  })

  const pro = subs.filter((s) => s.plan === "PRO")
  const growth = subs.filter((s) => s.plan === "GROWTH")
  const paid = subs.filter((s) => s.plan !== "FREE")
  const active = paid.filter((s) => s.status === "ACTIVE")
  const cancelling = paid.filter((s) => s.cancelAtPeriodEnd)
  const pastDue = paid.filter((s) => s.status === "PAST_DUE")

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Pro Subscriptions" value={pro.length} />
        <StatCard label="Growth Subscriptions" value={growth.length} />
        <StatCard label="Active" value={active.length} />
        <StatCard label="Cancelling at period end" value={cancelling.length} />
        <StatCard label="Past Due" value={pastDue.length} />
      </div>

      <div className="flex justify-end">
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
                  <Link href={`/admin/users/${s.user.id}`} className="text-[#A78BFA] hover:underline">
                    {s.user.email}
                  </Link>
                </td>
                <td className={tableCls.td}>
                  <PlanBadge plan={s.plan} />
                </td>
                <td className={tableCls.td}>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[s.status] ?? ""}`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className={`${tableCls.td} tabular-nums`}>
                  {s.creditsUsed} / {s.creditsTotal}
                  {s.extraCredits > 0 && <span className="text-[#A78BFA]"> +{s.extraCredits}</span>}
                </td>
                <td className={tableCls.td}>{formatDate(s.currentPeriodEnd)}</td>
                <td className={tableCls.td}>{s.cancelAtPeriodEnd ? "Yes" : "—"}</td>
                <td className={`${tableCls.td} text-[#6A6A6A]`}>
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
