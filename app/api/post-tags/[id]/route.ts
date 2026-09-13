import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

// PATCH /api/post-tags/[id] — edit { name?, color? }.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.postTag.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: { name?: string; color?: string } = {}

  try {
    const body = await req.json()
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Invalid name")
      data.name = body.name.trim().slice(0, 40)
    }
    if (body.color !== undefined) {
      if (typeof body.color !== "string" || !HEX_COLOR_RE.test(body.color)) throw new Error("Invalid color")
      data.color = body.color
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const tag = await db.postTag.update({ where: { id }, data })
  return NextResponse.json({ tag })
}

// DELETE /api/post-tags/[id] — un-tags every post that had it (implicit m2m
// rows are cleaned up automatically by Prisma/Postgres when the tag itself
// is deleted).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.postTag.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.postTag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
