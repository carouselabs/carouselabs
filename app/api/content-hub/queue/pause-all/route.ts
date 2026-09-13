import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/content-hub/queue/pause-all — flips every one of the user's
// QueueSlots to inactive in one action, instead of toggling each individually.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { count } = await db.queueSlot.updateMany({
    where: { userId: user.id, active: true },
    data: { active: false },
  })

  return NextResponse.json({ paused: count })
}
