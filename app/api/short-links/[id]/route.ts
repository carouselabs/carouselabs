import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// DELETE /api/short-links/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.shortLink.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.shortLink.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
