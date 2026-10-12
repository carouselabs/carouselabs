// /admin — overview dashboard. Server-rendered stats + recent activity;
// quick actions are a client island. Access is gated by the (admin) layout.
import { getOverviewStats } from "@/lib/adminStats"
import { AdminDashboardView } from "@/components/admin/AdminDashboardView"

export const dynamic = "force-dynamic"

export default async function AdminOverviewPage() {
  const s = await getOverviewStats()
  return <AdminDashboardView s={s} />
}
