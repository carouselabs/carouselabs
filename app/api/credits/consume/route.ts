// app/api/credits/consume/route.ts
// Single choke point for the weighted credit system. Clients call this BEFORE
// starting a chargeable generation; the deduction itself is atomic and fully
// server-side (lib/credits.ts). Generation routes additionally verify balance
// as defense-in-depth.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { consumeCredits } from "@/lib/credits"
import { CREDIT_COSTS, isPostAction, type CreditAction } from "@/lib/creditActions"
import { sendCreditsLowEmail, sendCreditsExhaustedEmail } from "@/lib/email"

// PRO low-balance email fires when a consume crosses this threshold.
const LOW_BALANCE_THRESHOLD = 100

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let action: CreditAction
  let amountOverride: number | undefined
  try {
    const body = await req.json()
    if (typeof body.action !== "string" || !(body.action in CREDIT_COSTS)) {
      throw new Error("Invalid action")
    }
    action = body.action as CreditAction
    amountOverride = typeof body.amount === "number" ? body.amount : undefined
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // The override can only INCREASE the charge — a client must never be able to
  // pay less than the action's listed cost.
  const cost = Math.max(CREDIT_COSTS[action], Math.floor(amountOverride ?? 0))

  const plan = user.subscription?.plan ?? "FREE"

  // Carousels are Pro-only — mirror the generation routes' gate.
  if (action === "carousel" && plan === "FREE") {
    return NextResponse.json(
      { ok: false, remainingCredits: 0, requiresUpgrade: true, error: "Carousels require the Pro plan" },
      { status: 403 },
    )
  }

  // FREE users don't have weighted credits: post actions consume their single
  // lifetime post; regenerations stay free (they're capped per session in the
  // UI, as before).
  if (plan === "FREE" && !isPostAction(action)) {
    return NextResponse.json({ ok: true, remainingCredits: 0, requiresUpgrade: false })
  }

  const result = await consumeCredits(user.id, cost)

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        remainingCredits: result.remaining,
        requiresUpgrade: result.requiresUpgrade,
        error: "Not enough credits",
      },
      { status: 402 },
    )
  }

  // Low-balance / exhausted notifications (PRO only — FREE users hit 0 on
  // their single lifetime post). Fire on threshold CROSSINGS so a user doesn't
  // get an email for every consume below the threshold. Best-effort.
  if (plan === "PRO") {
    const before = result.remaining + cost
    const name = user.profile?.name ?? ""
    try {
      if (result.remaining === 0) {
        await sendCreditsExhaustedEmail(user.email, name)
      } else if (before > LOW_BALANCE_THRESHOLD && result.remaining <= LOW_BALANCE_THRESHOLD) {
        await sendCreditsLowEmail(user.email, name, result.remaining)
      }
    } catch (err) {
      console.error("[credits/consume] balance email failed:", err)
    }
  }

  return NextResponse.json({
    ok: true,
    remainingCredits: result.remaining,
    requiresUpgrade: false,
  })
}
