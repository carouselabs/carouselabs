// /admin/sequences/[id] — edit one sequence (steps, segment, stop rule) and
// view its enrollment/engagement stats.
import { SequenceBuilder } from "@/components/admin/SequenceBuilder"

export const dynamic = "force-dynamic"

export default async function SequenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SequenceBuilder sequenceId={id} />
}
