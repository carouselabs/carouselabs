// /admin/broadcasts/post — share any LinkedIn post in an email
// (components/admin/postEmail/PostEmailEditor.tsx, lib/postEmail.ts).
import { PostEmailEditor } from "@/components/admin/postEmail/PostEmailEditor"

export const dynamic = "force-dynamic"

// ?reuse=campaign:<id>|template:<id> opens a shared post sent before
// (Broadcasts → Sent emails → Use again → Edit first).
export default async function AdminSharePostPage({ searchParams }: { searchParams: Promise<{ reuse?: string }> }) {
  const { reuse } = await searchParams
  return <PostEmailEditor reuse={reuse} />
}
