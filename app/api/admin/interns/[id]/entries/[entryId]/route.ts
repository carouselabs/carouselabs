// PATCH  /api/admin/interns/[id]/entries/[entryId] — edit a point entry.
// DELETE /api/admin/interns/[id]/entries/[entryId] — remove a point entry.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id, entryId } = await params

  let points: number | undefined
  let category: string | undefined
  let note: string | null | undefined
  try {
    const body = await req.json()
    if (body.points !== undefined) {
      if (typeof body.points !== "number" || !Number.isInteger(body.points)) throw new Error()
      points = body.points
    }
    if (body.category !== undefined) {
      if (typeof body.category !== "string" || !body.category.trim()) throw new Error()
      category = body.category.trim()
    }
    if (body.note !== undefined) {
      note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
    }
  } catch {
    return NextResponse.json({ error: "Invalid entry update" }, { status: 400 })
  }

  const existing = await db.internPointEntry.findUnique({ where: { id: entryId } })
  if (!existing || existing.internId !== id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const intern = await db.intern.findUnique({ where: { id } })

  const updated = await db.internPointEntry.update({
    where: { id: entryId },
    data: { points, category, note },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "UPDATE_INTERN_ENTRY",
    targetEmail: intern?.email,
    details: `Entry updated: ${updated.points >= 0 ? "+" : ""}${updated.points} pts — ${updated.category}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ entry: updated })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id, entryId } = await params

  const existing = await db.internPointEntry.findUnique({ where: { id: entryId } })
  if (!existing || existing.internId !== id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const intern = await db.intern.findUnique({ where: { id } })
  await db.internPointEntry.delete({ where: { id: entryId } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "DELETE_INTERN_ENTRY",
    targetEmail: intern?.email,
    details: `Entry deleted: ${existing.points >= 0 ? "+" : ""}${existing.points} pts — ${existing.category}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
