// /admin/interns — intern roster (data loads client-side from
// /api/admin/interns).
import { Suspense } from "react"
import { InternsTable } from "@/components/admin/InternsTable"
import { Spinner } from "@/components/admin/ui"

export const dynamic = "force-dynamic"

export default function AdminInternsPage() {
  return (
    <Suspense fallback={<Spinner label="Loading interns…" />}>
      <InternsTable />
    </Suspense>
  )
}
