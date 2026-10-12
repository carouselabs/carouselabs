// Phase 5b pages for the dev-only admin preview (see page.tsx): the Engage
// admin, Interns and email pages, with example props where the real page
// loads from the database. Client components fetch their own data, which the
// browser checks answer with example data.
import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Spinner } from "@/components/admin/ui"
import { EngageOverview } from "@/components/admin/engage/EngageOverview"
import { EngageUsersTable } from "@/components/admin/engage/EngageUsersTable"
import { EngageUserDetail } from "@/components/admin/engage/EngageUserDetail"
import { EngageGrantsTable } from "@/components/admin/engage/EngageGrantsTable"
import { EngageControls } from "@/components/admin/engage/EngageControls"
import { EngageAi } from "@/components/admin/engage/EngageAi"
import { EngageErrors } from "@/components/admin/engage/EngageErrors"
import { EngageHealth } from "@/components/admin/engage/EngageHealth"
import { EngageSessions } from "@/components/admin/engage/EngageSessions"
import { EngageAuditTable } from "@/components/admin/engage/EngageAuditTable"
import { InternsTable } from "@/components/admin/InternsTable"
import { InternDetail } from "@/components/admin/InternDetail"
import { DailyChecklist } from "@/components/admin/DailyChecklist"
import { SequencesTable } from "@/components/admin/SequencesTable"
import { SequenceBuilder } from "@/components/admin/SequenceBuilder"
import InternBroadcastPage from "@/app/(admin)/admin/interns/broadcast/page"
import BroadcastsPage from "@/app/(admin)/admin/broadcasts/page"
import ScheduledEmailsPage from "@/app/(admin)/admin/scheduled-emails/page"

const NOW = new Date()
const ago = (days: number) => new Date(NOW.getTime() - days * 86400000).toISOString()

function InternProfilePreview() {
  return (
    <div className="space-y-6">
      <Link href="/admin/interns" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        All interns
      </Link>
      <Suspense fallback={<Spinner label="Loading…" />}>
        <InternDetail
          intern={{
            id: "i1",
            name: "Example Intern 1",
            email: "intern1@example.com",
            phone: "+1 555 0100",
            role: "Design",
            department: "Marketing",
            photoUrl: null,
            status: "active",
            active: true,
            joinDate: ago(60),
            durationMonths: 3,
            endDate: ago(-30),
            totalPoints: 1240,
            pointsToday: 25,
            pointsThisWeek: 140,
            leaveBalance: { total: 5, used: 2, remaining: 3 },
            progress: { percentComplete: 67, daysRemaining: 30, isCompleted: false },
            rank: 2,
            attendanceFlag: "good",
            consecutiveAbsences: 0,
          }}
          entries={[
            { id: "e1", date: ago(0), points: 15, category: "Example: Daily LinkedIn post", note: "Example note", source: "checklist", addedBy: "admin@example.com", isPredefinedTask: true },
            { id: "e2", date: ago(1), points: 10, category: "Example: Design review", note: null, source: "manual", addedBy: "admin@example.com", isPredefinedTask: true },
            { id: "e3", date: ago(2), points: -5, category: "Example: Late submission", note: "Example", source: "manual", addedBy: "admin@example.com", isPredefinedTask: false },
          ]}
          attendance={[
            { id: "a1", date: ago(0), status: "present", note: null, markedBy: "admin@example.com" },
            { id: "a2", date: ago(1), status: "half-day", note: "Example", markedBy: "admin@example.com" },
          ]}
          leaveRequests={[{ id: "l1", date: ago(5), reason: "Example: family event", status: "approved", requestedAt: ago(8), reviewedBy: "auto", reviewedAt: ago(8) }]}
          notes={[{ id: "n1", content: "Example: strong week, faster on reviews.", type: "general", addedBy: "admin@example.com", createdAt: ago(3) }]}
          extensions={[{ id: "x1", addedDays: 14, reason: "Example: project wrap-up", previousEndDate: ago(-16), newEndDate: ago(-30), extendedBy: "admin@example.com", createdAt: ago(20) }]}
          certificates={[]}
          messages={[
            { id: "m1", sender: "intern", message: "Example: can I take Friday off?", read: false, createdAt: ago(1) },
            { id: "m2", sender: "admin", message: "Example: yes, apply in the portal.", read: true, createdAt: ago(0.5) },
          ]}
        />
      </Suspense>
    </div>
  )
}

function ChecklistPreview() {
  // Same layout as app/(admin)/admin/interns/[id]/checklist/page.tsx
  return (
    <div className="space-y-6">
      <Link href="/admin/interns/i1" className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Example Intern 1
      </Link>
      <div>
        <h2 className="text-lead font-bold text-foreground">Daily Checklist</h2>
        <p className="mt-0.5 text-caption text-muted-foreground">Example Intern 1 · intern1@example.com</p>
      </div>
      <DailyChecklist internId="i1" internRole="Design" />
    </div>
  )
}

export const PHASE_5B_PAGES: Record<string, () => ReactNode> = {
  engage: () => <EngageOverview />,
  "engage/users": () => (
    <Suspense>
      <EngageUsersTable />
    </Suspense>
  ),
  "engage/users/eu1": () => <EngageUserDetail userId="eu1" />,
  "engage/access": () => <EngageGrantsTable />,
  "engage/controls": () => <EngageControls />,
  "engage/ai": () => <EngageAi />,
  "engage/errors": () => <EngageErrors />,
  "engage/health": () => <EngageHealth />,
  "engage/sessions": () => <EngageSessions />,
  "engage/audit": () => <EngageAuditTable />,
  interns: () => (
    <Suspense fallback={<Spinner label="Loading interns…" />}>
      <InternsTable />
    </Suspense>
  ),
  "interns/i1": () => <InternProfilePreview />,
  "interns/i1/checklist": () => <ChecklistPreview />,
  "interns/broadcast": () => <InternBroadcastPage />,
  broadcasts: () => <BroadcastsPage />,
  sequences: () => <SequencesTable />,
  "sequences/new": () => <SequenceBuilder />,
  "sequences/q1": () => <SequenceBuilder sequenceId="q1" />,
  "scheduled-emails": () => <ScheduledEmailsPage />,
}
