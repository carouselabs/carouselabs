import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function isValidDaysOfWeek(val: unknown): val is number[] {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    val.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)
  )
}

// PATCH /api/content-hub/recurring/[id] — edit a slot, or just flip `active`
// to pause/resume it without deleting the rule.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.recurringSlot.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const data: {
    label?: string
    daysOfWeek?: number[]
    timeOfDay?: string
    active?: boolean
  } = {}

  try {
    const body = await req.json()
    if (body.label !== undefined) {
      if (typeof body.label !== "string" || !body.label.trim()) throw new Error("Invalid label")
      data.label = body.label.trim()
    }
    if (body.daysOfWeek !== undefined) {
      if (!isValidDaysOfWeek(body.daysOfWeek)) throw new Error("daysOfWeek must be 1+ integers 0-6")
      data.daysOfWeek = body.daysOfWeek
    }
    if (body.timeOfDay !== undefined) {
      if (typeof body.timeOfDay !== "string" || !TIME_RE.test(body.timeOfDay)) {
        throw new Error("timeOfDay must be 'HH:mm'")
      }
      data.timeOfDay = body.timeOfDay
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") throw new Error("active must be a boolean")
      data.active = body.active
    }
    // platform is intentionally not editable here — only linkedin is ever
    // creatable (see POST /api/content-hub/recurring), so there's nothing to
    // switch it to yet.
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const slot = await db.recurringSlot.update({ where: { id }, data })
  return NextResponse.json({ slot })
}

// DELETE /api/content-hub/recurring/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.recurringSlot.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.recurringSlot.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
