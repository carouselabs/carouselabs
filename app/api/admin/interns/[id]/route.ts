// GET   /api/admin/interns/[id] — intern detail + full entry history.
// PATCH /api/admin/interns/[id] — update active status.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { summarizeEntries, predefinedTaskNames } from "@/lib/internPoints"
import { groupEntriesByDate } from "@/lib/groupEntries"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const intern = await db.intern.findUnique({
    where: { id },
    include: { entries: { orderBy: { date: "desc" } } },
  })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const { total, pointsToday, pointsThisWeek } = summarizeEntries(intern.entries)
  const taskNames = await predefinedTaskNames()

  const entries = intern.entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    points: e.points,
    category: e.category,
    note: e.note,
    source: e.source,
    addedBy: e.addedBy,
    isPredefinedTask: taskNames.has(e.category),
  }))

  return NextResponse.json({
    intern: {
      id: intern.id,
      name: intern.name,
      email: intern.email,
      active: intern.active,
      createdAt: intern.createdAt,
      totalPoints: total,
      pointsToday,
      pointsThisWeek,
    },
    entries,
    // Same entries grouped by calendar day — lets the admin Daily Log view
    // (and any future consumer) render per-day rows without recomputing
    // this client-side.
    groupedByDate: groupEntriesByDate(entries),
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  let active: boolean
  try {
    const body = await req.json()
    if (typeof body.active !== "boolean") throw new Error()
    active = body.active
  } catch {
    return NextResponse.json({ error: "Expected { active: boolean }" }, { status: 400 })
  }

  try {
    const updated = await db.intern.update({ where: { id }, data: { active } })
    await logAdminAction({
      adminEmail: admin.email,
      action: "UPDATE_INTERN",
      targetEmail: updated.email,
      details: active ? "Marked active" : "Marked inactive",
      ipAddress: getRequestIp(req),
    })
    return NextResponse.json({ ok: true, active: updated.active })
  } catch {
    return NextResponse.json({ error: "Intern not found" }, { status: 404 })
  }
}
