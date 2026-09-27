// app/api/ext/devices/[id]/route.ts — signs the extension out on one
// browser from the website, by revoking that browser's token. The panel
// there drops to the Sign in screen on its next request (a 401).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"

// DELETE /api/ext/devices/:id
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const { id } = await params
  // Scoped by userId, so one account can't sign out another's browser.
  const result = await db.extensionToken.updateMany({
    where: { id, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (result.count === 0) {
    return NextResponse.json({ error: "Browser not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
