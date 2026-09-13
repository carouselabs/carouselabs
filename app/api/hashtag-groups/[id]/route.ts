import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

function normalizeHashtags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
    .map((h) => {
      const trimmed = h.trim().replace(/\s+/g, "")
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`
    })
    .slice(0, 30)
}

// PATCH /api/hashtag-groups/[id] — edit { name?, hashtags? }.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.hashtagGroup.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: { name?: string; hashtags?: string[] } = {}

  try {
    const body = await req.json()
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Invalid name")
      data.name = body.name.trim().slice(0, 40)
    }
    if (body.hashtags !== undefined) {
      const hashtags = normalizeHashtags(body.hashtags)
      if (hashtags.length === 0) throw new Error("Add at least one hashtag")
      data.hashtags = hashtags
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const group = await db.hashtagGroup.update({ where: { id }, data })
  return NextResponse.json({ group })
}

// DELETE /api/hashtag-groups/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.hashtagGroup.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.hashtagGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
