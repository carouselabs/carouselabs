// POST /api/admin/users/[userId]/credits — admin credit operations.
// body: { action: "grant" | "set" | "reset", amount?: number }
//   grant → adds `amount` extra credits (no expiry — admin grants don't lapse)
//   set   → sets the monthly allowance (creditsTotal) to `amount`
//   reset → creditsUsed back to 0, creditsTotal back to the plan's default
//           (1000 for PRO, 2000 for GROWTH; FREE has no monthly total)
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { creditsForPlan } from "@/lib/lemonsqueezy"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  let action: string
  let amount = 0
  try {
    const body = await req.json()
    action = body.action
    amount = Number(body.amount ?? 0)
    if (!["grant", "set", "reset"].includes(action)) throw new Error()
    if (action !== "reset" && (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000)) {
      throw new Error()
    }
  } catch {
    return NextResponse.json(
      { error: "Expected { action: grant|set|reset, amount?: positive number }" },
      { status: 400 },
    )
  }

  const sub = await db.subscription.findUnique({ where: { userId }, include: { user: true } })
  if (!sub) return NextResponse.json({ error: "User has no subscription row" }, { status: 404 })

  const resetTotal = sub.plan === "FREE" ? sub.creditsTotal : creditsForPlan(sub.plan)
  const data =
    action === "grant"
      ? { extraCredits: { increment: Math.round(amount) }, extraCreditsExpiry: null }
      : action === "set"
        ? { creditsTotal: Math.round(amount) }
        : { creditsUsed: 0, creditsTotal: resetTotal }

  const updated = await db.subscription.update({ where: { userId }, data })

  const auditAction = action === "grant" ? "GRANT_CREDITS" : action === "set" ? "SET_CREDITS" : "RESET_CREDITS"
  const details =
    action === "grant"
      ? `Granted ${Math.round(amount)} extra credits`
      : action === "set"
        ? `Set monthly allowance to ${Math.round(amount)}`
        : `Reset credits to 0 / ${resetTotal}`
  await logAdminAction({
    adminEmail: admin.email,
    action: auditAction,
    targetUserId: userId,
    targetEmail: sub.user.email,
    details,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({
    ok: true,
    creditsUsed: updated.creditsUsed,
    creditsTotal: updated.creditsTotal,
    extraCredits: updated.extraCredits,
  })
}
