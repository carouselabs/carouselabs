"use client"

// /admin/interns/[id] — interactive half of the intern profile: tab
// navigation over Overview / Daily Log / Leave & Attendance / Notes /
// Performance Report. All tabs share one `intern` (+ entries/attendance/
// leaveRequests/notes/extensions) state, refreshed as a whole from
// GET /api/admin/interns/[id] after any mutating action.
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { LeaveRequestsPanel } from "@/components/admin/LeaveRequestsPanel"
import { useToast } from "@/components/admin/Toast"
import { OverviewTab } from "@/components/admin/intern/OverviewTab"
import { DailyLogTab } from "@/components/admin/intern/DailyLogTab"
import { NotesTab } from "@/components/admin/intern/NotesTab"
import { ReportTab } from "@/components/admin/intern/ReportTab"
import { CertificatesTab } from "@/components/admin/intern/CertificatesTab"
import { SupportTab } from "@/components/admin/intern/SupportTab"
import type {
  AttendanceRecord,
  InternCertificateT,
  InternEntry,
  InternExtensionT,
  InternMessageT,
  InternNoteT,
  InternProfile,
  LeaveRequest,
} from "@/components/admin/intern/types"

export type { InternEntry, InternProfile }

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "daily-log", label: "Daily Log" },
  { key: "leave", label: "Leave & Attendance" },
  { key: "notes", label: "Notes" },
  { key: "support", label: "Support" },
  { key: "certificates", label: "Certificates" },
  { key: "report", label: "Performance Report" },
] as const
type TabKey = (typeof TABS)[number]["key"]

export function InternDetail({
  intern: initialIntern,
  entries: initialEntries,
  attendance: initialAttendance,
  leaveRequests: initialLeaveRequests,
  notes: initialNotes,
  extensions: initialExtensions,
  certificates: initialCertificates,
  messages: initialMessages,
}: {
  intern: InternProfile
  entries: InternEntry[]
  attendance: AttendanceRecord[]
  leaveRequests: LeaveRequest[]
  notes: InternNoteT[]
  extensions: InternExtensionT[]
  certificates: InternCertificateT[]
  messages: InternMessageT[]
}) {
  const { toast } = useToast()
  // Lets the "Reply in Admin" link in the new-support-message notification
  // email deep-link straight to this tab (?tab=support).
  const requestedTab = useSearchParams().get("tab")
  const initialTab = TABS.some((t) => t.key === requestedTab) ? (requestedTab as TabKey) : "overview"
  const [tab, setTab] = useState<TabKey>(initialTab)

  const [intern, setIntern] = useState(initialIntern)
  const [entries, setEntries] = useState(initialEntries)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests)
  const [notes, setNotes] = useState(initialNotes)
  const [extensions, setExtensions] = useState(initialExtensions)
  const [certificates, setCertificates] = useState(initialCertificates)
  const [messages, setMessages] = useState(initialMessages)

  const unreadMessageCount = messages.filter((m) => m.sender === "intern" && !m.read).length

  const refresh = async () => {
    const res = await fetch(`/api/admin/interns/${intern.id}`)
    if (!res.ok) {
      toast("Failed to refresh intern data", "error")
      return
    }
    const data = await res.json()
    setIntern((prev) => ({ ...prev, ...data.intern }))
    setEntries(data.entries)
    setAttendance(data.attendance)
    setLeaveRequests(data.leaveRequests)
    setNotes(data.notes)
    setExtensions(data.extensions)
    setCertificates(data.certificates)
    setMessages(data.messages)
  }

  return (
    <div className="space-y-6">
      {/* Sections as underline tabs, the same as the Engage admin's */}
      <div role="tablist" aria-label="Intern sections" className="flex gap-1 overflow-x-auto border-b border-border print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-caption font-medium whitespace-nowrap transition-colors duration-(--motion-fast) ${
              tab === t.key ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.key === "support" && unreadMessageCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-danger-foreground">
                {unreadMessageCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab intern={intern} attendance={attendance} extensions={extensions} onRefresh={refresh} />
      )}
      {tab === "daily-log" && (
        <DailyLogTab internId={intern.id} entries={entries} attendance={attendance} onRefresh={refresh} />
      )}
      {tab === "leave" && (
        <LeaveRequestsPanel
          internId={intern.id}
          leaveRequests={leaveRequests}
          leaveBalance={intern.leaveBalance}
          onRevoked={refresh}
        />
      )}
      {tab === "notes" && <NotesTab internId={intern.id} notes={notes} onRefresh={refresh} />}
      {tab === "support" && <SupportTab internId={intern.id} messages={messages} onRefresh={refresh} />}
      {tab === "certificates" && (
        <CertificatesTab internId={intern.id} certificates={certificates} onRefresh={refresh} />
      )}
      {tab === "report" && (
        <ReportTab intern={intern} entries={entries} attendance={attendance} notes={notes} />
      )}
    </div>
  )
}
