import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidPlatform } from "@/lib/platforms"

// "HH:mm", 00-23 : 00-59.
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function isValidDayOfWeek(val: unknown): val is number {
  return typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 6
}

// GET /api/content-hub/queue — the user's queue slots, ordered for a
// readable "week at a glance" list (day, then time within that day).
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const slots = await db.queueSlot.findMany({
    where: { userId: user.id },
    orderBy: [{ dayOfWeek: "asc" }, { timeOfDay: "asc" }],
  })
  return NextResponse.json({ slots })
}

// POST /api/content-hub/queue — add one preset time slot. Body:
// { dayOfWeek, timeOfDay, platform }. Every platform is acceptable here (not
// just functional ones) — same reasoning as the Custom Post composer: a
// queue slot for a not-yet-connected platform just means posts assigned to
// it land as "pending_connection" until that platform goes live.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let dayOfWeek: number
  let timeOfDay: string
  let platform: string

  try {
    const body = await req.json()
    if (!isValidDayOfWeek(body.dayOfWeek)) throw new Error("dayOfWeek must be an integer 0-6")
    dayOfWeek = body.dayOfWeek
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

  const slot = await db.queueSlot.create({
    data: { userId: user.id, dayOfWeek, timeOfDay, platform },
  })

  return NextResponse.json({ slot })
}
