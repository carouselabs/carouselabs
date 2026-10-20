// /admin/broadcasts/campaigns/[id] — one campaign: who has had it, and
// sending the next batch.
import { CampaignView } from "@/components/admin/CampaignView"

export const dynamic = "force-dynamic"

export default async function AdminCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CampaignView id={id} />
}
