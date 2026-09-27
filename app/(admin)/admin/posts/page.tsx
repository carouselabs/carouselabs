// /admin/posts — everything users make (website posts and extension
// generations) as an image gallery, with filters.
import { Suspense } from "react"
import { PostsGallery } from "@/components/admin/PostsGallery"
import { Spinner } from "@/components/admin/ui"

export const dynamic = "force-dynamic"

export default function AdminPostsPage() {
  return (
    <Suspense fallback={<Spinner label="Loading posts…" />}>
      <PostsGallery />
    </Suspense>
  )
}
