// /admin/sequences/new — create a sequence. A static sibling of
// [id]/page.tsx rather than overloading it with id === "new" — Next.js
// resolves this static segment ahead of the dynamic one, so /new can never
// be swallowed by [id].
import { SequenceBuilder } from "@/components/admin/SequenceBuilder"

export default function NewSequencePage() {
  return <SequenceBuilder />
}
