// app/api/credits/consume/route.ts
// READ-ONLY balance endpoint. Credit deduction happens server-side inside the
// generation routes (V1 fix) — this endpoint no longer deducts anything; it
// exists so the UI can display the current balance before/after generations.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { availableCredits } from "@/lib/credits"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sub = await db.subscription.findUnique({ where: { userId: user.id } })
  if (!sub) {
    return NextResponse.json({ ok: false, remainingCredits: 0, requiresUpgrade: true })
  }

  const remaining = availableCredits({
    plan: sub.plan as "FREE" | "PRO",
    creditsUsed: sub.creditsUsed,
    creditsTotal: sub.creditsTotal,
    extraCredits: sub.extraCredits,
    extraCreditsExpiry: sub.extraCreditsExpiry,
  })

  return NextResponse.json({
    ok: remaining > 0,
    remainingCredits: remaining,
    requiresUpgrade: sub.plan === "FREE" && remaining === 0,
  })
}
