// /admin/broadcasts/leads — people who don't use CarouseLabs yet, uploaded
// from CSV files to send campaigns to (components/admin/LeadsManager.tsx).
import { LeadsManager } from "@/components/admin/LeadsManager"

export const dynamic = "force-dynamic"

export default function AdminLeadsPage() {
  return <LeadsManager />
}
