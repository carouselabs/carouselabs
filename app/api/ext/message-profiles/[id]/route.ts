// app/api/ext/message-profiles/[id]/route.ts — edit and delete a custom
// Conversation Assistant profile. Every query here is scoped by
// { userId, isSystem: false }, so a valid token can neither touch another
// user's profile nor mutate one of the shared presets by guessing its id.
// Mirrors app/api/ext/connection-profiles/[id].
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { parseMessageProfileInput } from "@/lib/messageProfiles"

// PUT /api/ext/message-profiles/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = parseMessageProfileInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  // updateMany rather than update: it reports a miss as count 0 instead of
  // throwing, and it lets the ownership scope live in the where clause.
  const result = await db.messageProfile.updateMany({
    where: { id, userId: user.id, isSystem: false },
    data: parsed.value,
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  if ((body as { setAsDefault?: unknown })?.setAsDefault === true) {
    await db.user.update({ where: { id: user.id }, data: { defaultMessageProfileId: id } })
  }

  const profile = await db.messageProfile.findUnique({ where: { id } })
  return NextResponse.json({ profile })
}

// DELETE /api/ext/message-profiles/:id
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const { id } = await params

  const result = await db.messageProfile.deleteMany({
    where: { id, userId: user.id, isSystem: false },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  // Clear the pointer if this was the user's default, otherwise the panel
  // would preselect a profile that no longer exists.
  if (user.defaultMessageProfileId === id) {
    await db.user.update({ where: { id: user.id }, data: { defaultMessageProfileId: null } })
  }

  return NextResponse.json({ ok: true })
}
