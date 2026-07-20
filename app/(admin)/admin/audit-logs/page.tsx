// /admin/audit-logs — trail of every mutating admin action.
import { AuditLogsTable } from "@/components/admin/AuditLogsTable"

export const dynamic = "force-dynamic"

export default function AdminAuditLogsPage() {
  return <AuditLogsTable />
}
