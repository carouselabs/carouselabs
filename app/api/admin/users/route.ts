// GET /api/admin/users — all users with subscription + post counts, shaped
// for the admin users table (which filters/sorts/pages client-side).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  // ?email= narrows to one exact (case-insensitive) match — used by the
  // overview quick actions to resolve an email to a userId.
  const email = new URL(req.url).searchParams.get("email")?.trim()

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(email ? { email: { equals: email, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { name: true } },
      subscription: true,
      usage: { select: { postsTotal: true } },
      _count: { select: { posts: true } },
    },
  })

  return NextResponse.json({
    users: users.map((u) => {
      const sub = u.subscription
      const plan = sub?.plan ?? "FREE"
      return {
        id: u.id,
        email: u.email,
        name: u.profile?.name ?? null,
        plan,
        creditsUsed: sub?.creditsUsed ?? 0,
        creditsTotal: sub?.creditsTotal ?? 0,
        creditsRemaining: sub
          ? availableCredits({
              plan: plan as "FREE" | "PRO",
              creditsUsed: sub.creditsUsed,
              creditsTotal: sub.creditsTotal,
              extraCredits: sub.extraCredits,
              extraCreditsExpiry: sub.extraCreditsExpiry,
            })
          : 0,
        postsCount: u._count.posts,
        createdAt: u.createdAt,
        lastActive: u.updatedAt,
        suspendedAt: u.suspendedAt,
        adminNote: u.adminNote,
      }
    }),
  })
}
