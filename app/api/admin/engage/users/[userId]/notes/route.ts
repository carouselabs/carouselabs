// /api/admin/engage/users/[userId]/notes — internal notes on a user. Never
// shown to the user.
//   POST   { body }
//   DELETE ?noteId=
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const body = z.object({ body: z.string().trim().min(1, "Write something").max(5000) })

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.notes")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response

  const note = await db.adminNote.create({ data: { userId, authorEmail: gate.admin.email, body: parsed.data.body } })
  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_ADD_NOTE",
    product: "engage",
    targetUserId: userId,
    targetEmail: user.email,
    details: "Added an internal note",
    newValue: { noteId: note.id },
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ note }, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.notes")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const noteId = new URL(req.url).searchParams.get("noteId")
  if (!noteId) return NextResponse.json({ error: "Missing noteId" }, { status: 400 })

  const note = await db.adminNote.findFirst({ where: { id: noteId, userId } })
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 })
  await db.adminNote.delete({ where: { id: noteId } })

  // The audit row keeps what the note said, so deleting one leaves a trace.
  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_DELETE_NOTE",
    product: "engage",
    targetUserId: userId,
    details: "Deleted an internal note",
    oldValue: { noteId, body: note.body, author: note.authorEmail, createdAt: note.createdAt.toISOString() },
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true })
}
