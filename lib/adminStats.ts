// lib/adminStats.ts
// Shared aggregate queries for the admin overview page and /api/admin/stats.
import { db } from "@/lib/db"

// Average $ cost per credit (rough blend of Claude + gpt-image spend).
export const COST_PER_CREDIT = 0.025

// There is no credit ledger table, so admin views derive a post's credit cost
// from its format using the post-level weights in lib/creditActions.ts
// (regenerations aren't attributable per-post and are excluded).
export function postCreditCost(format: "CAROUSEL" | "SINGLE_IMAGE" | "TEXT_ONLY"): number {
  return format === "CAROUSEL" ? 40 : format === "SINGLE_IMAGE" ? 15 : 5
}

export async function getOverviewStats() {
  const [
    totalUsers,
    proUsers,
    growthUsers,
    totalPosts,
    totalCarousels,
    totalImages,
    creditsAgg,
    recentUsers,
    recentPosts,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.subscription.count({ where: { plan: "PRO", user: { deletedAt: null } } }),
    db.subscription.count({ where: { plan: "GROWTH", user: { deletedAt: null } } }),
    db.post.count(),
    db.post.count({ where: { format: "CAROUSEL" } }),
    db.post.count({ where: { format: "SINGLE_IMAGE" } }),
    // FREE rows track lifetime posts (0/1) in creditsUsed, so only paid-plan
    // rows represent real weighted credits.
    db.subscription.aggregate({
      where: { plan: { in: ["PRO", "GROWTH"] } },
      _sum: { creditsUsed: true },
    }),
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { subscription: { select: { plan: true } }, profile: { select: { name: true } } },
    }),
    db.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { email: true } } },
    }),
  ])

  const totalCreditsUsed = creditsAgg._sum.creditsUsed ?? 0

  return {
    totalUsers,
    proUsers,
    growthUsers,
    freeUsers: totalUsers - proUsers - growthUsers,
    totalPosts,
    totalCarousels,
    totalImages,
    totalCreditsUsed,
    estApiCost: totalCreditsUsed * COST_PER_CREDIT,
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.profile?.name ?? null,
      plan: u.subscription?.plan ?? "FREE",
      createdAt: u.createdAt,
    })),
    recentPosts: recentPosts.map((p) => ({
      id: p.id,
      email: p.user.email,
      title: p.title,
      format: p.format,
      status: p.status,
      createdAt: p.createdAt,
    })),
  }
}

export type OverviewStats = Awaited<ReturnType<typeof getOverviewStats>>

const COHORT_WEEKS = 8

export type CohortRow = {
  weekStart: string
  weekEnd: string
  newUsers: number
  postedWeek1: number
  postedWeek2: number
  convertedToPro: number
  retentionPct: number
}

// Weekly signup cohorts over the last 8 weeks. "Week 1"/"week 2" are relative
// to each user's OWN signup date (not the calendar week), which is the
// standard cohort-retention definition. "Converted to Pro" reflects CURRENT
// plan status (PRO or GROWTH), not a true 30-day-window conversion —
// Subscription.createdAt is set once at signup bootstrap and never moves on
// upgrade (there's no upgradedAt column), so it can't answer "converted
// within 30 days".
export async function getCohortAnalysis(): Promise<CohortRow[]> {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - COHORT_WEEKS * 7)
  start.setHours(0, 0, 0, 0)

  const users = await db.user.findMany({
    where: { deletedAt: null, createdAt: { gte: start } },
    select: { id: true, createdAt: true, subscription: { select: { plan: true } } },
  })
  const userIds = users.map((u) => u.id)
  const posts = userIds.length
    ? await db.post.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, createdAt: true },
      })
    : []

  const postsByUser = new Map<string, Date[]>()
  for (const p of posts) {
    const arr = postsByUser.get(p.userId)
    if (arr) arr.push(p.createdAt)
    else postsByUser.set(p.userId, [p.createdAt])
  }

  type CohortUser = (typeof users)[number]
  const buckets: { weekStart: Date; weekEnd: Date; users: CohortUser[] }[] = []
  for (let i = COHORT_WEEKS - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    buckets.push({ weekStart, weekEnd, users: [] })
  }
  for (const u of users) {
    const bucket = buckets.find((b) => u.createdAt >= b.weekStart && u.createdAt < b.weekEnd)
    bucket?.users.push(u)
  }

  return buckets.map(({ weekStart, weekEnd, users: cohortUsers }) => {
    let postedWeek1 = 0
    let postedWeek2 = 0
    let convertedToPro = 0
    for (const u of cohortUsers) {
      const userPosts = postsByUser.get(u.id) ?? []
      const w1End = new Date(u.createdAt)
      w1End.setDate(w1End.getDate() + 7)
      const w2End = new Date(u.createdAt)
      w2End.setDate(w2End.getDate() + 14)
      if (userPosts.some((d) => d >= u.createdAt && d < w1End)) postedWeek1++
      if (userPosts.some((d) => d >= w1End && d < w2End)) postedWeek2++
      if (u.subscription?.plan === "PRO" || u.subscription?.plan === "GROWTH") convertedToPro++
    }
    const newUsers = cohortUsers.length
    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      weekEnd: weekEnd.toISOString().slice(0, 10),
      newUsers,
      postedWeek1,
      postedWeek2,
      convertedToPro,
      retentionPct: newUsers > 0 ? Math.round((postedWeek2 / newUsers) * 100) : 0,
    }
  })
}
