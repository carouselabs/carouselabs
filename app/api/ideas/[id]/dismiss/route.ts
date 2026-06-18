// app/api/ideas/[id]/dismiss/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const idea = await db.idea.findUnique({ where: { id } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.idea.update({
    where: { id },
    data: { isDismissed: true },
  })

  return NextResponse.json({ success: true })
}
