// GET /api/admin/analytics — daily time series for the last 30 days plus
// breakdowns. Credits-per-day is DERIVED from post formats (no ledger table),
// so regenerations aren't included; the UI labels it as an estimate.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { postCreditCost } from "@/lib/adminStats"

const DAYS = 30

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const since = new Date()
  since.setDate(since.getDate() - (DAYS - 1))
  since.setHours(0, 0, 0, 0)

  const [recentPosts, allUsers, proSubs, formatCounts] = await Promise.all([
    db.post.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, format: true },
    }),
    db.user.findMany({ where: { deletedAt: null }, select: { createdAt: true } }),
    db.subscription.findMany({ where: { plan: "PRO" }, select: { createdAt: true } }),
    db.post.groupBy({ by: ["format"], _count: { _all: true } }),
  ])

  // Seed every day in range so charts have no gaps.
  const days: string[] = []
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    days.push(dayKey(d))
  }
  const byDay = new Map(
    days.map((k) => [k, { date: k, posts: 0, credits: 0, newUsers: 0 }]),
  )

  for (const p of recentPosts) {
    const row = byDay.get(dayKey(p.createdAt))
    if (!row) continue
    row.posts += 1
    row.credits += postCreditCost(p.format)
  }
  for (const u of allUsers) {
    const row = byDay.get(dayKey(u.createdAt))
    if (row) row.newUsers += 1
  }

  // Cumulative users vs pro over the window. Pro-signup date approximated by
  // the subscription row's createdAt (upgrade timestamps aren't stored).
  const totalUsersBefore = allUsers.filter((u) => u.createdAt < since).length
  const proBefore = proSubs.filter((s) => s.createdAt < since).length
  let cumUsers = totalUsersBefore
  let cumPro = proBefore
  const growth = days.map((k) => {
    cumUsers += allUsers.filter((u) => dayKey(u.createdAt) === k).length
    cumPro += proSubs.filter((s) => dayKey(s.createdAt) === k).length
    return { date: k, totalUsers: cumUsers, proUsers: cumPro, freeUsers: cumUsers - cumPro }
  })

  return NextResponse.json({
    daily: days.map((k) => byDay.get(k)),
    growth,
    postsByType: formatCounts.map((f) => ({ format: f.format, count: f._count._all })),
  })
}
