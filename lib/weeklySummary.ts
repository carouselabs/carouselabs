// lib/weeklySummary.ts — builds one user's data for the Weekly Summary email
// (Settings > Account > Notifications' "Weekly summary" toggle — see
// app/api/cron/weekly-summary-email/route.ts, which calls this once per
// opted-in user). Read-only; sends nothing itself.
import { db } from "@/lib/db"
import { availableCredits, MONTHLY_CREDITS } from "@/lib/credits"
import { getReferralEarningsSummary } from "@/lib/referral"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
// Capped at the DB level, not just sliced after fetching — the email only
// ever shows 5 of each, so there's no reason to pull more rows than that
// for a highly active user.
const LIST_CAP = 5

export interface WeeklySummaryPost {
  id: string
  title: string
  platform: string
  scheduledFor: string // ISO
  publishedUrl: string | null
}

export interface WeeklySummaryData {
  name: string
  email: string
  publishedPosts: WeeklySummaryPost[]
  publishedCount: number
  upcomingPosts: WeeklySummaryPost[]
  upcomingCount: number
  referralPending: number
  referralPaid: number
  hasReferralActivity: boolean
  creditsRemaining: number
  plan: "FREE" | "PRO" | "GROWTH"
  // True if there's anything at all worth emailing about — the cron uses
  // this to skip inactive users rather than send an empty digest.
  hasAnyActivity: boolean
}

export async function generateWeeklySummaryData(userId: string): Promise<WeeklySummaryData> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true, subscription: true },
  })
  if (!user) throw new Error(`generateWeeklySummaryData: user ${userId} not found`)

  const now = new Date()
  const weekAgo = new Date(now.getTime() - WEEK_MS)
  const weekAhead = new Date(now.getTime() + WEEK_MS)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [publishedCount, publishedRows, upcomingCount, upcomingRows, earnings] = await Promise.all([
    db.scheduledPost.count({
      where: { userId, status: "published", updatedAt: { gte: weekAgo } },
    }),
    db.scheduledPost.findMany({
      where: { userId, status: "published", updatedAt: { gte: weekAgo } },
      orderBy: { updatedAt: "desc" },
      take: LIST_CAP,
      include: { post: { select: { title: true } } },
    }),
    // "Upcoming" covers both platforms that will actually fire (queued) and
    // ones just waiting on a connection (pending_connection) — from the
    // user's point of view both are "on my schedule for next week", even
    // though only "queued" will actually publish itself.
    db.scheduledPost.count({
      where: {
        userId,
        status: { in: ["queued", "pending_connection"] },
        scheduledFor: { gte: now, lte: weekAhead },
      },
    }),
    db.scheduledPost.findMany({
      where: {
        userId,
        status: { in: ["queued", "pending_connection"] },
        scheduledFor: { gte: now, lte: weekAhead },
      },
      orderBy: { scheduledFor: "asc" },
      take: LIST_CAP,
      include: { post: { select: { title: true } } },
    }),
    getReferralEarningsSummary(user.id, monthStart),
  ])

  const sub = user.subscription
  const plan = sub?.plan ?? "FREE"
  const creditsRemaining = availableCredits({
    plan,
    creditsUsed: sub?.creditsUsed ?? 0,
    creditsTotal: sub?.creditsTotal ?? MONTHLY_CREDITS,
    extraCredits: sub?.extraCredits ?? 0,
    extraCreditsExpiry: sub?.extraCreditsExpiry ?? null,
  })

  const hasReferralActivity = earnings.pending > 0 || earnings.paid > 0

  return {
    name: user.profile?.name ?? "",
    email: user.email,
    publishedPosts: publishedRows.map((s) => ({
      id: s.id,
      title: s.post.title,
      platform: s.platform,
      scheduledFor: s.scheduledFor.toISOString(),
      publishedUrl: s.publishedUrl,
    })),
    publishedCount,
    upcomingPosts: upcomingRows.map((s) => ({
      id: s.id,
      title: s.post.title,
      platform: s.platform,
      scheduledFor: s.scheduledFor.toISOString(),
      publishedUrl: null,
    })),
    upcomingCount,
    referralPending: earnings.pending,
    referralPaid: earnings.paid,
    hasReferralActivity,
    creditsRemaining,
    plan,
    hasAnyActivity: publishedCount > 0 || upcomingCount > 0 || hasReferralActivity,
  }
}
