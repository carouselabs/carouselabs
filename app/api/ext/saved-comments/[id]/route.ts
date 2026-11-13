// app/api/ext/saved-comments/[id]/route.ts — edit or delete one saved
// comment. Every query is scoped by userId, so an id belonging to someone
// else reads as not found.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { parseSavedCommentChanges, savedCommentForClient } from "@/lib/engageSavedComments"

// PATCH /api/ext/saved-comments/:id — body: only the fields that change
// (title, body, tags, favorite, remindOn).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const parsed = parseSavedCommentChanges(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const result = await db.engageSavedComment.updateMany({ where: { id, userId: user.id }, data: parsed.value })
  if (result.count === 0) return NextResponse.json({ error: "Saved comment not found" }, { status: 404 })
  const row = await db.engageSavedComment.findUnique({ where: { id } })
  if (!row) return NextResponse.json({ error: "Saved comment not found" }, { status: 404 })
  return NextResponse.json({ savedComment: savedCommentForClient(row) })
}

// DELETE /api/ext/saved-comments/:id
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const result = await db.engageSavedComment.deleteMany({ where: { id, userId: user.id } })
  if (result.count === 0) return NextResponse.json({ error: "Saved comment not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
