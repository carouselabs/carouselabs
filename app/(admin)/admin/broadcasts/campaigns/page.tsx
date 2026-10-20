// /admin/broadcasts/campaigns — email campaigns sent in batches you pick.
import { CampaignsList } from "@/components/admin/CampaignsList"

export const dynamic = "force-dynamic"

export default function AdminCampaignsPage() {
  return <CampaignsList />
}
