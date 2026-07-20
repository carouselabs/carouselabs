// /admin/users — user management table (data loads client-side from
// /api/admin/users; Suspense wrapper is required for useSearchParams).
import { Suspense } from "react"
import { UsersTable } from "@/components/admin/UsersTable"
import { Spinner } from "@/components/admin/ui"

export const dynamic = "force-dynamic"

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<Spinner label="Loading users…" />}>
      <UsersTable />
    </Suspense>
  )
}
