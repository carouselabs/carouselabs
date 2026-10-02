import { Suspense } from "react"
import { EngageUsersTable } from "@/components/admin/engage/EngageUsersTable"

// The table reads its filters from the URL, so it renders inside Suspense.
export default function EngageUsersPage() {
  return (
    <Suspense>
      <EngageUsersTable />
    </Suspense>
  )
}
