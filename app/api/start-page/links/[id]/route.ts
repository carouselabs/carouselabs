import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isSafeLinkUrl } from "@/lib/startPage"

// PATCH /api/start-page/links/[id] — edit { label, url }, and/or reorder via
// { direction: "up" | "down" } (swaps `order` with the adjacent link).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.startPageLink.findUnique({
    where: { id },
    include: { startPage: { select: { userId: true } } },
  })
  if (!existing || existing.startPage.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: { label?: string; url?: string } = {}
  let direction: "up" | "down" | undefined

  try {
    const body = await req.json()
    if (body.label !== undefined) {
      if (typeof body.label !== "string" || !body.label.trim()) throw new Error("Invalid label")
      data.label = body.label.trim().slice(0, 60)
    }
    if (body.url !== undefined) {
      if (typeof body.url !== "string" || !isSafeLinkUrl(body.url.trim())) {
        throw new Error("url must be a valid http(s) link")
      }
      data.url = body.url.trim()
    }
    if (body.direction !== undefined) {
      if (body.direction !== "up" && body.direction !== "down") throw new Error("direction must be 'up' or 'down'")
      direction = body.direction
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (direction) {
    const neighbor = await db.startPageLink.findFirst({
      where: {
        startPageId: existing.startPageId,
        order: direction === "up" ? { lt: existing.order } : { gt: existing.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    })
    if (neighbor) {
      await db.$transaction([
        db.startPageLink.update({ where: { id: existing.id }, data: { order: neighbor.order } }),
        db.startPageLink.update({ where: { id: neighbor.id }, data: { order: existing.order } }),
      ])
    }
    // No neighbor (already first/last) — silently a no-op, same as most
    // reorder UIs disabling the button at the boundary.
  }

  if (Object.keys(data).length > 0) {
    await db.startPageLink.update({ where: { id: existing.id }, data })
  }

  const link = await db.startPageLink.findUnique({ where: { id: existing.id } })
  return NextResponse.json({ link })
}

// DELETE /api/start-page/links/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.startPageLink.findUnique({
    where: { id },
    include: { startPage: { select: { userId: true } } },
  })
  if (!existing || existing.startPage.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.startPageLink.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
