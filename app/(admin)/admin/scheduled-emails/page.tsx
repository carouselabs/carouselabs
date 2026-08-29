// /admin/scheduled-emails — every queued/sent/failed scheduled broadcast
// (both Intern Broadcast and the regular-user Broadcast), with cancel and
// reschedule for anything still queued. Sent every 5 min by
// app/api/cron/publish-scheduled-emails.
import { ScheduledEmailsList } from "@/components/admin/ScheduledEmailsList"

export const dynamic = "force-dynamic"

export default function AdminScheduledEmailsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-bold text-white">Scheduled Emails</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8A8A8A]">
          Broadcasts queued to send later, from both the Interns and Broadcasts pages.
        </p>
      </div>
      <ScheduledEmailsList />
    </div>
  )
}
