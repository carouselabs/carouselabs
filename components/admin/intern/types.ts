// Shared types for the admin intern-profile tabs (components/admin/intern/*
// and components/admin/InternDetail.tsx).
import type { AttendanceRecord } from "@/lib/groupEntries"
import type { LeaveRequest, LeaveBalance } from "@/components/admin/LeaveRequestsPanel"

export type InternEntry = {
  id: string
  date: string
  points: number
  category: string
  note: string | null
  source: string
  addedBy: string
  isPredefinedTask: boolean
}

export type InternProgress = { percentComplete: number; daysRemaining: number; isCompleted: boolean }

export type AttendanceFlag = "good" | "warning" | "critical"

export type InternProfile = {
  id: string
  name: string
  email: string
  phone: string | null
  role: string | null
  department: string | null
  photoUrl: string | null
  status: string
  active: boolean
  joinDate: string
  durationMonths: number
  endDate: string
  totalPoints: number
  pointsToday: number
  pointsThisWeek: number
  leaveBalance: LeaveBalance
  progress: InternProgress
  rank: number | null
  attendanceFlag: AttendanceFlag
  consecutiveAbsences: number
}

export type InternNoteT = {
  id: string
  content: string
  type: string
  addedBy: string
  createdAt: string
}

export type InternExtensionT = {
  id: string
  addedDays: number
  reason: string | null
  previousEndDate: string
  newEndDate: string
  extendedBy: string
  createdAt: string
}

export type { AttendanceRecord, LeaveRequest, LeaveBalance }
