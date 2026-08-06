// /admin/interns/[id] — intern's full entry history, running totals, and
// admin controls (add/edit/delete entries, toggle active).
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { summarizeEntries, predefinedTaskNames } from "@/lib/internPoints"
import { InternDetail } from "@/components/admin/InternDetail"

export const dynamic = "force-dynamic"

export default async function AdminInternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const intern = await db.intern.findUnique({
    where: { id },
    include: { entries: { orderBy: { date: "desc" } } },
  })
  if (!intern) notFound()

  const { total, pointsToday, pointsThisWeek } = summarizeEntries(intern.entries)
  const taskNames = await predefinedTaskNames()

  return (
    <div className="space-y-6">
      <Link
        href="/admin/interns"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8A8A8A] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All interns
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#7C3AED]/20 text-[18px] font-bold text-[#A78BFA]">
          {intern.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-white">{intern.name}</h1>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">{intern.email}</p>
        </div>
      </div>

      <InternDetail
        intern={{
          id: intern.id,
          name: intern.name,
          email: intern.email,
          active: intern.active,
          totalPoints: total,
          pointsToday,
          pointsThisWeek,
        }}
        entries={intern.entries.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          points: e.points,
          category: e.category,
          note: e.note,
          source: e.source,
          addedBy: e.addedBy,
          isPredefinedTask: taskNames.has(e.category),
        }))}
      />
    </div>
  )
}
