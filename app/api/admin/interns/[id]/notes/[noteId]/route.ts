// DELETE /api/admin/interns/[id]/notes/[noteId] — remove a note, for
// correcting mistakes.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id, noteId } = await params

  const note = await db.internNote.findUnique({ where: { id: noteId } })
  if (!note || note.internId !== id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 })
  }

  const intern = await db.intern.findUnique({ where: { id } })
  await db.internNote.delete({ where: { id: noteId } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "DELETE_INTERN_NOTE",
    targetEmail: intern?.email,
    details: `Deleted ${note.type} note: "${note.content.slice(0, 120)}${note.content.length > 120 ? "…" : ""}"`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
