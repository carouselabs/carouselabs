// /admin/users/[userId] — full user profile with admin actions panel.
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"
import { postCreditCost } from "@/lib/adminStats"
import { PlanBadge, StatCard, fmtDate, fmtDateTime, tableCls } from "@/components/admin/ui"
import { UserAdminActions } from "@/components/admin/UserAdminActions"

export const dynamic = "force-dynamic"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: true,
      posts: {
        orderBy: { createdAt: "desc" },
        include: { idea: { select: { title: true, hook: true } } },
      },
    },
  })
  if (!user) notFound()

  const sub = user.subscription
  const plan = sub?.plan ?? "FREE"
  const creditsRemaining = sub
    ? availableCredits({
        plan: plan as "FREE" | "PRO",
        creditsUsed: sub.creditsUsed,
        creditsTotal: sub.creditsTotal,
        extraCredits: sub.extraCredits,
        extraCreditsExpiry: sub.extraCreditsExpiry,
      })
    : 0

  const counts = {
    captions: user.posts.filter((p) => p.format === "TEXT_ONLY").length,
    images: user.posts.filter((p) => p.format === "SINGLE_IMAGE").length,
    carousels: user.posts.filter((p) => p.format === "CAROUSEL").length,
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8A8A8A] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All users
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[18px] font-bold text-[#A78BFA]">
          {(user.profile?.name ?? user.email)[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[18px] font-bold text-white">{user.profile?.name ?? user.email}</h1>
            <PlanBadge plan={plan} />
            {user.suspendedAt && (
              <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                SUSPENDED
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">
            {user.email} · joined {fmtDate(user.createdAt)} · last active {fmtDate(user.updatedAt)}
            {user.profile?.headline ? ` · ${user.profile.headline}` : ""}
          </p>
        </div>
      </div>

      {/* Subscription + usage stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Credits"
          value={`${creditsRemaining}`}
          hint={
            sub
              ? `${sub.creditsUsed} used of ${sub.creditsTotal}${sub.extraCredits ? ` (+${sub.extraCredits} extra)` : ""}`
              : "no subscription row"
          }
        />
        <StatCard
          label="Renewal"
          value={sub?.currentPeriodEnd ? fmtDate(sub.currentPeriodEnd) : "—"}
          hint={sub?.cancelAtPeriodEnd ? "cancels at period end" : sub?.status ?? undefined}
        />
        <StatCard
          label="Posts"
          value={user.posts.length}
          hint={`${counts.captions} captions · ${counts.images} images · ${counts.carousels} carousels`}
        />
        <StatCard
          label="Est. credits spent"
          value={user.posts.reduce((acc, p) => acc + postCreditCost(p.format), 0)}
          hint="derived from post formats (no ledger)"
        />
      </div>

      {/* Admin actions */}
      <UserAdminActions
        userId={user.id}
        email={user.email}
        plan={plan as "FREE" | "PRO"}
        suspended={!!user.suspendedAt}
        adminNote={user.adminNote}
      />

      {/* Posts table */}
      <div>
        <h2 className="mb-3 text-[13px] font-semibold text-white">All Posts ({user.posts.length})</h2>
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Title</th>
                <th className={tableCls.th}>Type</th>
                <th className={tableCls.th}>Status</th>
                <th className={tableCls.th}>Idea</th>
                <th className={tableCls.th}>Credits</th>
                <th className={tableCls.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {user.posts.length === 0 && (
                <tr>
                  <td className={tableCls.td} colSpan={6}>
                    No posts yet
                  </td>
                </tr>
              )}
              {user.posts.map((p) => (
                <tr key={p.id} className={tableCls.row}>
                  <td className={`${tableCls.td} max-w-[280px] truncate`}>{p.title}</td>
                  <td className={tableCls.td}>{p.format.replace("_", " ")}</td>
                  <td className={tableCls.td}>{p.status}</td>
                  <td className={`${tableCls.td} max-w-[280px] truncate text-[#8A8A8A]`}>
                    {p.idea?.hook ?? p.idea?.title ?? "—"}
                  </td>
                  <td className={`${tableCls.td} tabular-nums`}>{postCreditCost(p.format)}</td>
                  <td className={tableCls.td}>{fmtDateTime(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[#6A6A6A]">
          Credit costs are derived from post format (caption 5 · image 15 · carousel 40). There is no
          per-charge ledger table, so regenerations aren&apos;t itemized.
        </p>
      </div>
    </div>
  )
}
