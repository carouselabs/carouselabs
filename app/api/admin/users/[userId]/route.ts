// GET  /api/admin/users/[userId] — full detail for the user profile page.
// PATCH /api/admin/users/[userId] — update the admin note.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: true,
      usage: true,
      posts: {
        orderBy: { createdAt: "desc" },
        include: { idea: { select: { title: true, hook: true } } },
      },
    },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const sub = user.subscription
  const plan = sub?.plan ?? "FREE"
  const counts = {
    total: user.posts.length,
    captions: user.posts.filter((p) => p.format === "TEXT_ONLY").length,
    images: user.posts.filter((p) => p.format === "SINGLE_IMAGE").length,
    carousels: user.posts.filter((p) => p.format === "CAROUSEL").length,
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.profile?.name ?? null,
    headline: user.profile?.headline ?? null,
    createdAt: user.createdAt,
    lastActive: user.updatedAt,
    suspendedAt: user.suspendedAt,
    adminNote: user.adminNote,
    subscription: sub
      ? {
          plan,
          status: sub.status,
          creditsUsed: sub.creditsUsed,
          creditsTotal: sub.creditsTotal,
          extraCredits: sub.extraCredits,
          creditsRemaining: availableCredits({
            plan: plan as "FREE" | "PRO",
            creditsUsed: sub.creditsUsed,
            creditsTotal: sub.creditsTotal,
            extraCredits: sub.extraCredits,
            extraCreditsExpiry: sub.extraCreditsExpiry,
          }),
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    usage: counts,
    posts: user.posts.map((p) => ({
      id: p.id,
      title: p.title,
      format: p.format,
      status: p.status,
      ideaTitle: p.idea?.title ?? null,
      ideaHook: p.idea?.hook ?? null,
      createdAt: p.createdAt,
    })),
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  let adminNote: string
  try {
    const body = await req.json()
    if (typeof body.adminNote !== "string") throw new Error()
    adminNote = body.adminNote.slice(0, 5000)
  } catch {
    return NextResponse.json({ error: "adminNote (string) is required" }, { status: 400 })
  }

  try {
    await db.user.update({ where: { id: userId }, data: { adminNote } })
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
