import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidPlatform } from "@/lib/platforms"

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function isValidDayOfWeek(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 6
}

// PATCH /api/content-hub/queue/[id] — edit a slot, or just flip `active` to
// pause/resume it without deleting it.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.queueSlot.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: { dayOfWeek?: number; timeOfDay?: string; platform?: string; active?: boolean } = {}

  try {
    const body = await req.json()
    if (body.dayOfWeek !== undefined) {
      if (!isValidDayOfWeek(body.dayOfWeek)) throw new Error("dayOfWeek must be an integer 0-6")
      data.dayOfWeek = body.dayOfWeek
    }
    if (body.timeOfDay !== undefined) {
      if (typeof body.timeOfDay !== "string" || !TIME_RE.test(body.timeOfDay)) {
        throw new Error("timeOfDay must be 'HH:mm'")
      }
      data.timeOfDay = body.timeOfDay
    }
    if (body.platform !== undefined) {
      if (!isValidPlatform(body.platform)) throw new Error("Unsupported platform")
      data.platform = body.platform
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") throw new Error("active must be a boolean")
      data.active = body.active
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const slot = await db.queueSlot.update({ where: { id }, data })
  return NextResponse.json({ slot })
}

// DELETE /api/content-hub/queue/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.queueSlot.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.queueSlot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
