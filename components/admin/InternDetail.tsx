"use client"

// /admin/interns/[id] — interactive half of the intern profile: tab
// navigation over Overview / Daily Log / Leave & Attendance / Notes /
// Performance Report. All tabs share one `intern` (+ entries/attendance/
// leaveRequests/notes/extensions) state, refreshed as a whole from
// GET /api/admin/interns/[id] after any mutating action.
import { useState } from "react"
import { LeaveRequestsPanel } from "@/components/admin/LeaveRequestsPanel"
import { useToast } from "@/components/admin/Toast"
import { OverviewTab } from "@/components/admin/intern/OverviewTab"
import { DailyLogTab } from "@/components/admin/intern/DailyLogTab"
import { NotesTab } from "@/components/admin/intern/NotesTab"
import { ReportTab } from "@/components/admin/intern/ReportTab"
import type {
  AttendanceRecord,
  InternEntry,
  InternExtensionT,
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
}: {
  intern: InternProfile
  entries: InternEntry[]
  attendance: AttendanceRecord[]
  leaveRequests: LeaveRequest[]
  notes: InternNoteT[]
  extensions: InternExtensionT[]
}) {
  const { toast } = useToast()
  const [tab, setTab] = useState<TabKey>("overview")

  const [intern, setIntern] = useState(initialIntern)
  const [entries, setEntries] = useState(initialEntries)
  const [attendance, setAttendance] = useState(initialAttendance)
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests)
  const [notes, setNotes] = useState(initialNotes)
  const [extensions, setExtensions] = useState(initialExtensions)

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
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-1.5 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
              tab === t.key ? "bg-[#7C3AED] text-white" : "text-[#8A8A8A] hover:bg-[#232323] hover:text-white"
            }`}
          >
            {t.label}
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
      {tab === "report" && (
        <ReportTab intern={intern} entries={entries} attendance={attendance} notes={notes} />
      )}
    </div>
  )
}
