// /admin/interns/broadcast — compose and send an announcement email to
// active interns or a hand-picked selection.
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { InternBroadcastComposer } from "@/components/admin/InternBroadcastComposer"

export const dynamic = "force-dynamic"

export default function AdminInternBroadcastPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/interns"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8A8A8A] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Interns
      </Link>

      <div>
        <h1 className="text-[18px] font-bold text-white">Send Announcement</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">
          Email all active interns, or a specific selection.
        </p>
      </div>

      <InternBroadcastComposer />
    </div>
  )
}
