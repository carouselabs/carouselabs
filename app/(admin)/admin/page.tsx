// /admin — overview dashboard. Server-rendered stats + recent activity;
// quick actions are a client island. Access is gated by the (admin) layout.
import Link from "next/link"
import {
  Users,
  Crown,
  Gem,
  UserRound,
  FileText,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  Coins,
  DollarSign,
} from "lucide-react"
import { getOverviewStats } from "@/lib/adminStats"
import { StatCard, PlanBadge, tableCls } from "@/components/admin/ui"
import { QuickActions } from "@/components/admin/QuickActions"

export const dynamic = "force-dynamic"

// fmtDate/fmtDateTime live in components/admin/ui.tsx, which is a "use
// client" module — every export of a client module becomes a client
// reference, so calling them as plain functions from this server component
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

export default async function AdminOverviewPage() {
  const s = await getOverviewStats()

  const stats = [
    { label: "Total Users", value: s.totalUsers, icon: <Users className="h-4 w-4" /> },
    { label: "Pro Users", value: s.proUsers, icon: <Crown className="h-4 w-4" /> },
    { label: "Growth Users", value: s.growthUsers, icon: <Gem className="h-4 w-4" /> },
    { label: "Free Users", value: s.freeUsers, icon: <UserRound className="h-4 w-4" /> },
    { label: "Total Posts", value: s.totalPosts, icon: <FileText className="h-4 w-4" /> },
    { label: "Carousels", value: s.totalCarousels, icon: <GalleryHorizontalEnd className="h-4 w-4" /> },
    { label: "Images", value: s.totalImages, icon: <ImageIcon className="h-4 w-4" /> },
    { label: "Credits Used", value: s.totalCreditsUsed.toLocaleString(), icon: <Coins className="h-4 w-4" /> },
    {
      label: "Est. API Cost",
      value: `$${s.estApiCost.toFixed(2)}`,
      icon: <DollarSign className="h-4 w-4" />,
      hint: "credits used × $0.025",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((st) => (
          <StatCard key={st.label} label={st.label} value={st.value} icon={st.icon} hint={st.hint} />
        ))}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[13px] font-semibold text-white">Recent Signups</h2>
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
                      <Link href={`/admin/users/${u.id}`} className="text-[#A78BFA] hover:underline">
                        {u.email}
                      </Link>
                      {u.name && <span className="ml-2 text-[#6A6A6A]">{u.name}</span>}
                    </td>
                    <td className={tableCls.td}>
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className={tableCls.td}>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-semibold text-white">Recent Posts</h2>
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
                      <span className="text-[#B0B0B0]">{p.format.replace("_", " ")}</span>
                    </td>
                    <td className={tableCls.td}>{formatDateTime(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
