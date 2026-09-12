// /admin/sequences — list every drip sequence.
import { SequencesTable } from "@/components/admin/SequencesTable"

export const dynamic = "force-dynamic"

export default function AdminSequencesPage() {
  return <SequencesTable />
}
