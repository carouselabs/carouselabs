// /admin/posts — all generated content with filters.
import { Suspense } from "react"
import { PostsTable } from "@/components/admin/PostsTable"
import { Spinner } from "@/components/admin/ui"

export const dynamic = "force-dynamic"

export default function AdminPostsPage() {
  return (
    <Suspense fallback={<Spinner label="Loading posts…" />}>
      <PostsTable />
    </Suspense>
  )
}
