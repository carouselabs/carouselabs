// app/api/ext/saved-comments/[id]/use/route.ts — the panel inserted or
// copied a saved comment: counted, and dated, so the list can show how often
// each is used and keep the ones in use near the top.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"

// POST /api/ext/saved-comments/:id/use
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const lastUsedAt = new Date()
  const result = await db.engageSavedComment.updateMany({
    where: { id, userId: user.id },
    data: { useCount: { increment: 1 }, lastUsedAt },
  })
  if (result.count === 0) return NextResponse.json({ error: "Saved comment not found" }, { status: 404 })
  return NextResponse.json({ ok: true, lastUsedAt: lastUsedAt.toISOString() })
}
