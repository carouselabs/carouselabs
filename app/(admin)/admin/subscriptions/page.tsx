// /admin/subscriptions — billing overview (server-rendered from Prisma).
import { db } from "@/lib/db"
import { SubscriptionsView } from "@/components/admin/SubscriptionsView"

export const dynamic = "force-dynamic"

export default async function AdminSubscriptionsPage() {
  const subs = await db.subscription.findMany({
    where: { user: { deletedAt: null } },
    orderBy: [{ plan: "desc" }, { updatedAt: "desc" }],
    include: { user: { select: { id: true, email: true } } },
  })

  return <SubscriptionsView subs={subs} />
}
