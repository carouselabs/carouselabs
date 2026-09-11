// /api/admin/referrals/[userId]
//   GET  — full commission + payout history for one referrer
//   POST — record a payout: creates a ReferralPayout and marks every
//          currently-"pending" commission for this referrer "paid", both in
//          one transaction (see recordPayout below).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  const referrer = await db.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { name: true } } },
  })
  if (!referrer) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const [commissions, payouts] = await Promise.all([
    db.referralCommission.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    db.referralPayout.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const pendingBalance = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0)

  return NextResponse.json({
    referrer: {
      id: referrer.id,
      name: referrer.profile?.name ?? null,
      email: referrer.email,
      payoutMethod: referrer.payoutMethod,
      payoutDetails: referrer.payoutDetails,
    },
    pendingBalance,
    commissions,
    payouts,
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params

  let amount: number
  let method: string | null
  try {
    const body = await req.json()
    amount = Number(body.amount)
    method = typeof body.method === "string" && body.method.trim() ? body.method.trim() : null
    if (!Number.isFinite(amount) || amount <= 0) throw new Error()
  } catch {
    return NextResponse.json({ error: "Expected { amount: positive number, method?: string }" }, { status: 400 })
  }

  const referrer = await db.user.findUnique({ where: { id: userId } })
  if (!referrer) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const payout = await db.$transaction(async (tx) => {
    const created = await tx.referralPayout.create({
      data: { referrerId: userId, amount, method, paidBy: admin.email },
    })
    await tx.referralCommission.updateMany({
      where: { referrerId: userId, status: "pending" },
      data: { status: "paid", paidAt: new Date(), paidBy: admin.email },
    })
    return created
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "REFERRAL_PAYOUT_RECORDED",
    targetUserId: userId,
    targetEmail: referrer.email,
    details: `Recorded payout of $${amount.toFixed(2)}${method ? ` via ${method}` : ""} — all pending commissions marked paid`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, payout })
}
