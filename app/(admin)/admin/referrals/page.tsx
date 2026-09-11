// /admin/referrals — referral program: referrer list, per-referrer
// commission/payout detail, and recording payouts.
import { ReferralsTable } from "@/components/admin/ReferralsTable"

export const dynamic = "force-dynamic"

export default function AdminReferralsPage() {
  return <ReferralsTable />
}
