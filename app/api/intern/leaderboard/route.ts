// GET /api/intern/leaderboard — all active interns ranked by all-time total
// points, descending. Name + total only (no email, no entry detail) so any
// authenticated intern can see where they rank without seeing teammates'
// activity logs.
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getLeaderboard } from "@/lib/internPoints"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leaderboard = await getLeaderboard()
  return NextResponse.json({ leaderboard })
}
