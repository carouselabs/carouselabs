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
        className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Interns
      </Link>

      <div>
        <h2 className="text-lead font-bold text-foreground">Send Announcement</h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          Email all active interns, or a specific selection.
        </p>
      </div>

      <InternBroadcastComposer />
    </div>
  )
}
