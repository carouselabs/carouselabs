// app/api/ext/contacts/[id]/route.ts — forget one contact's conversation
// setting. Next time that chat is opened, the panel asks for a reason again.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"

// DELETE /api/ext/contacts/:id
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { id } = await params
  // Scoped by userId, so one account can't touch another's rows.
  const result = await db.contactContext.deleteMany({ where: { id, userId: user.id } })
  if (result.count === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
