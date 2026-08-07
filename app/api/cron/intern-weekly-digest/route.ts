// app/api/cron/intern-weekly-digest/route.ts
// Weekly cron (see vercel.json): emails ADMIN_EMAIL one summary of every
// active intern's week — points, attendance, new notes, and current
// attendance flag. Fires from a schedule, not user action.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendInternWeeklyDigestEmail } from "@/lib/email"
import { startOfWeek, getAttendanceFlag } from "@/lib/internPoints"
import type { InternDigestRow } from "@/emails/InternWeeklyDigestEmail"

const FLAG_ORDER: Record<InternDigestRow["flag"], number> = { critical: 0, warning: 1, good: 2 }

export async function GET(req: Request) {
  // Secret gate. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when
  // CRON_SECRET is set; we also accept a ?secret= query param for manual runs.
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? new URL(req.url).searchParams.get("secret")
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.error("[cron/intern-weekly-digest] ADMIN_EMAIL not configured")
    return NextResponse.json({ error: "ADMIN_EMAIL not configured" }, { status: 500 })
  }

  const interns = await db.intern.findMany({
    where: { active: true },
    include: {
      entries: { select: { points: true, date: true } },
      attendance: { select: { date: true, status: true } },
      notes: { select: { createdAt: true } },
    },
  })

  // Nothing to summarize — skip silently rather than sending an empty email.
  if (interns.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no active interns" })
  }

  const weekStart = startOfWeek()
  const weekLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const rows: InternDigestRow[] = interns.map((i) => {
    const pointsThisWeek = i.entries.filter((e) => e.date >= weekStart).reduce((sum, e) => sum + e.points, 0)

    const weekAttendance = i.attendance.filter((a) => a.date >= weekStart)
    const present = weekAttendance.filter((a) => a.status === "present").length
    const absent = weekAttendance.filter((a) => a.status === "absent").length
    const halfDay = weekAttendance.filter((a) => a.status === "half-day").length
    const leave = weekAttendance.filter((a) => a.status === "leave").length

    const newNotes = i.notes.filter((n) => n.createdAt >= weekStart).length

    // Flag uses all-time attendance (same calculation as the roster/profile
    // pages), not just this week — "current status", not "this week's rate".
    const allPresent = i.attendance.filter((a) => a.status === "present").length
    const allAbsent = i.attendance.filter((a) => a.status === "absent").length
    const allHalfDay = i.attendance.filter((a) => a.status === "half-day").length
    const flag = getAttendanceFlag(allPresent, allAbsent, allHalfDay)

    return { id: i.id, name: i.name, role: i.role, pointsThisWeek, present, absent, halfDay, leave, newNotes, flag }
  })

  // Critical/warning interns surfaced first for visibility.
  rows.sort((a, b) => FLAG_ORDER[a.flag] - FLAG_ORDER[b.flag] || a.name.localeCompare(b.name))

  try {
    await sendInternWeeklyDigestEmail(adminEmail, weekLabel, rows)
  } catch (err) {
    console.error("[cron/intern-weekly-digest] send failed:", err)
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 })
  }

  console.log(`[cron/intern-weekly-digest] sent digest for ${rows.length} interns`)
  return NextResponse.json({ ok: true, count: rows.length })
}
