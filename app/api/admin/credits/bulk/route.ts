// POST /api/admin/credits/bulk — grant extra credits to multiple users.
// body: { userIds: string[], amount: number }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let userIds: string[]
  let amount: number
  try {
    const body = await req.json()
    userIds = body.userIds
    amount = Number(body.amount)
    if (
      !Array.isArray(userIds) ||
      userIds.length === 0 ||
      userIds.length > 500 ||
      userIds.some((id) => typeof id !== "string") ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1_000_000
    ) {
      throw new Error()
    }
  } catch {
    return NextResponse.json(
      { error: "Expected { userIds: string[], amount: positive number }" },
      { status: 400 },
    )
  }

  const res = await db.subscription.updateMany({
    where: { userId: { in: userIds } },
    data: { extraCredits: { increment: Math.round(amount) }, extraCreditsExpiry: null },
  })
  return NextResponse.json({ ok: true, updated: res.count })
}
