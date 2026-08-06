// /admin/tasks — manage the predefined tasks offered in the intern points
// board's "Quick Task" add-entry mode.
import { Suspense } from "react"
import { TasksTable } from "@/components/admin/TasksTable"
import { Spinner } from "@/components/admin/ui"

export const dynamic = "force-dynamic"

export default function AdminTasksPage() {
  return (
    <Suspense fallback={<Spinner label="Loading tasks…" />}>
      <TasksTable />
    </Suspense>
  )
}
