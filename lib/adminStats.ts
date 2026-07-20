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
    totalPosts,
    totalCarousels,
    totalImages,
    creditsAgg,
    recentUsers,
    recentPosts,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.subscription.count({ where: { plan: "PRO", user: { deletedAt: null } } }),
    db.post.count(),
    db.post.count({ where: { format: "CAROUSEL" } }),
    db.post.count({ where: { format: "SINGLE_IMAGE" } }),
    // FREE rows track lifetime posts (0/1) in creditsUsed, so only PRO rows
    // represent real weighted credits.
    db.subscription.aggregate({ where: { plan: "PRO" }, _sum: { creditsUsed: true } }),
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
    freeUsers: totalUsers - proUsers,
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
