import { EngageOverview } from "@/components/admin/engage/EngageOverview"

// Engage → Overview. Access is checked by the (admin) layout and again by
// every API route the page calls.
export default function EngageOverviewPage() {
  return <EngageOverview />
}
