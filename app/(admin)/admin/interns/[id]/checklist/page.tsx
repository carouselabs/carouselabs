// /admin/interns/[id]/checklist — Daily Checklist: log a full day's
// predefined-task completions (+ any custom entries) for an intern in one
// atomic save.
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { DailyChecklist } from "@/components/admin/DailyChecklist"

export const dynamic = "force-dynamic"

export default async function AdminInternChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const intern = await db.intern.findUnique({ where: { id }, select: { id: true, name: true, email: true } })
  if (!intern) notFound()

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/interns/${intern.id}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8A8A8A] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {intern.name}
      </Link>

      <div>
        <h1 className="text-[18px] font-bold text-white">Daily Checklist</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">
          {intern.name} · {intern.email}
        </p>
      </div>

      <DailyChecklist internId={intern.id} />
    </div>
  )
}
