// GET /api/intern/leaderboard?period=all|month|week — active interns ranked
// by points within the requested period, descending. Name + total only (no
// email, no entry detail) so any authenticated intern can see where they
// rank without seeing teammates' activity logs.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getOwnedInternId } from "@/lib/internAuth"
import { getAdminUser } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { getLeaderboard, getPeriodRange, type LeaderboardPeriod } from "@/lib/internPoints"

const PERIODS = new Set<LeaderboardPeriod>(["all", "month", "week"])

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const internId = await getOwnedInternId(user)
  const intern = internId ? await db.intern.findFirst({ where: { id: internId, active: true } }) : null
  if (!intern && !(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const periodParam = new URL(req.url).searchParams.get("period")
  const period: LeaderboardPeriod = PERIODS.has(periodParam as LeaderboardPeriod)
    ? (periodParam as LeaderboardPeriod)
    : "all"

  const leaderboard = await getLeaderboard(period)
  const range = getPeriodRange(period)
  return NextResponse.json({
    leaderboard,
    period,
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
  })
}
