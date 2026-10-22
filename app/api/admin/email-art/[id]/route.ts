// DELETE /api/admin/email-art/[id] — takes a picture or sticker out of the AI
// email writer's saved art. The image itself stays: emails already sent
// still show it.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { removeArt } from "@/lib/emailArtLibrary"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  if (!(await removeArt(id))) return NextResponse.json({ error: "That image isn't in the library" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
