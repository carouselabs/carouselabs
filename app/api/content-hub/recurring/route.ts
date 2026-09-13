import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidPlatform, type Platform } from "@/lib/platforms"

// "HH:mm", 00-23 : 00-59.
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function isValidDaysOfWeek(val: unknown): val is number[] {
  return (
    Array.isArray(val) &&
    val.length > 0 &&
    val.every((d) => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)
  )
}

// GET /api/content-hub/recurring — the user's recurring slots, most recently
// created first.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const slots = await db.recurringSlot.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ slots })
}

// POST /api/content-hub/recurring — "post automatically every [days] at
// [time] on [platform]". Body: { label, daysOfWeek, timeOfDay, platform }
// Every platform is creatable, not just functional ones — same reasoning as
// the Custom Post composer and Queue Settings: a rule for a not-yet-connected
// platform is saved and simply never fires (see the cron's
// fulfillRecurringSlots, which skips any slot whose platform isn't
// functional yet) until that platform gets real API access.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let label: string
  let daysOfWeek: number[]
  let timeOfDay: string
  let platform: Platform

  try {
    const body = await req.json()
    label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Recurring post"
    if (!isValidDaysOfWeek(body.daysOfWeek)) throw new Error("daysOfWeek must be 1+ integers 0-6")
    daysOfWeek = body.daysOfWeek
    if (typeof body.timeOfDay !== "string" || !TIME_RE.test(body.timeOfDay)) {
      throw new Error("timeOfDay must be 'HH:mm'")
    }
    timeOfDay = body.timeOfDay
    if (!isValidPlatform(body.platform)) throw new Error("Unsupported platform")
    platform = body.platform
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const slot = await db.recurringSlot.create({
    data: { userId: user.id, label, daysOfWeek, timeOfDay, platform },
  })

  return NextResponse.json({ slot })
}
