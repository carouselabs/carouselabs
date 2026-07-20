// POST /api/admin/users/[userId]/credits — admin credit operations.
// body: { action: "grant" | "set" | "reset", amount?: number }
//   grant → adds `amount` extra credits (no expiry — admin grants don't lapse)
//   set   → sets the monthly allowance (creditsTotal) to `amount`
//   reset → creditsUsed back to 0 and creditsTotal back to 1000
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { MONTHLY_CREDITS } from "@/lib/credits"

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

  const sub = await db.subscription.findUnique({ where: { userId } })
  if (!sub) return NextResponse.json({ error: "User has no subscription row" }, { status: 404 })

  const data =
    action === "grant"
      ? { extraCredits: { increment: Math.round(amount) }, extraCreditsExpiry: null }
      : action === "set"
        ? { creditsTotal: Math.round(amount) }
        : { creditsUsed: 0, creditsTotal: MONTHLY_CREDITS }

  const updated = await db.subscription.update({ where: { userId }, data })
  return NextResponse.json({
    ok: true,
    creditsUsed: updated.creditsUsed,
    creditsTotal: updated.creditsTotal,
    extraCredits: updated.extraCredits,
  })
}
