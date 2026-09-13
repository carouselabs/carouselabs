import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// PATCH /api/post-templates/[id] — edit { name?, caption? }.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.postTemplate.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: { name?: string; caption?: string } = {}

  try {
    const body = await req.json()
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Invalid name")
      data.name = body.name.trim().slice(0, 60)
    }
    if (body.caption !== undefined) {
      if (typeof body.caption !== "string" || !body.caption.trim()) throw new Error("Invalid caption")
      data.caption = body.caption.trim()
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const template = await db.postTemplate.update({ where: { id }, data })
  return NextResponse.json({ template })
}

// DELETE /api/post-templates/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.postTemplate.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.postTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
