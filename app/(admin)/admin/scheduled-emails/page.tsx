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
        <h2 className="text-lead font-bold text-foreground">Scheduled Emails</h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          Broadcasts queued to send later, from both the Interns and Broadcasts pages.
        </p>
      </div>
      <ScheduledEmailsList />
    </div>
  )
}
