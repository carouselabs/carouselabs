// lib/referral.ts
// Single-tier referral program — shared constants + the two money-moving
// operations (grant the one-time free-signup bonus, create a paid-referral
// commission), both written to be safe to call from a webhook: idempotent,
// guarded against self-referral, and never throwing on a benign duplicate.
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import {
  REFERRAL_CODE_CHARSET,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
  REFERRAL_COOKIE_MAX_AGE_SECONDS,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referralConstants"

// Re-exported so existing/future callers of lib/referral only need one import.
export { REFERRAL_CODE_PATTERN, REFERRAL_COOKIE_MAX_AGE_SECONDS, REFERRAL_COOKIE_NAME }

const MAX_GENERATION_ATTEMPTS = 5

function randomCode(): string {
  let code = ""
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
    code += REFERRAL_CODE_CHARSET[Math.floor(Math.random() * REFERRAL_CODE_CHARSET.length)]
  }
  return code
}

// Generates a unique referralCode for a user who doesn't have one yet —
// called lazily the first time they open Settings > Referrals (see
// app/api/referrals/me). Retries on collision rather than assuming the first
// random draw is unique; at CODE_LENGTH=7 over a 32-character charset
// (32^7 ≈ 34 billion combinations) a collision is exceedingly unlikely, but
// this is cheap insurance and the spec asks for it explicitly.
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } })
  if (existing?.referralCode) return existing.referralCode

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = randomCode()
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } })
      return code
    } catch (err) {
      // P2002 = unique constraint violation (another user already has this
      // code) — retry with a fresh draw. Any other error is unexpected.
      if (!isUniqueConstraintError(err)) throw err
    }
  }
  throw new Error(`ensureReferralCode: exhausted ${MAX_GENERATION_ATTEMPTS} attempts for user ${userId}`)
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  )
}

// ── Rewards ──────────────────────────────────────────────────────────
export const FREE_REFERRAL_BONUS_CREDITS = 50
export const REFERRAL_COMMISSION_RATE = 0.08 // 8% of subtotal (pre-tax), recurring

// Creates the Referral row for a brand-new signup and grants the one-time
// free-signup bonus, with the fraud guards from the spec:
//   GUARD 1 — no referrer found for the code → silently no-op (invalid/
//             tampered/expired code should never surface an error to signup)
//   GUARD 2 — referrerId === referredUserId is impossible by construction
//             here (the referrer is looked up by CODE, and a user can't
//             know their own code before this function creates their
//             account+code) — checked explicitly anyway as a hard backstop
//   GUARD 3 — the @unique on referredUserId is the real enforcement of "one
//             referral per person"; the create is wrapped in try/catch so a
//             race (e.g. a retried webhook delivery) fails closed rather
//             than crashing the signup flow
// Called from the Clerk webhook's user.created handler — never throws.
export async function createReferralForSignup(
  referredUserId: string,
  referralCode: string,
): Promise<void> {
  const code = referralCode.trim().toUpperCase()
  if (!REFERRAL_CODE_PATTERN.test(code)) return // malformed — treat as absent, not an error

  const referrer = await db.user.findUnique({ where: { referralCode: code }, select: { id: true } })
  if (!referrer) return // GUARD 1 — unknown/tampered code, silently ignore

  if (referrer.id === referredUserId) return // GUARD 2 — self-referral, impossible-but-checked

  let referral: { id: string } | null = null
  try {
    referral = await db.referral.create({
      data: { referrerId: referrer.id, referredUserId },
      select: { id: true },
    })
  } catch (err) {
    // GUARD 3 — @unique(referredUserId) violation: this person already has
    // a referral (race between a webhook retry and itself, or any other
    // path that could double-fire). Not an error — just already handled.
    if (isUniqueConstraintError(err)) {
      console.log(
        `[referral] createReferralForSignup: referral already exists for user ${referredUserId}, skipping`,
      )
      return
    }
    throw err
  }

  // Free-signup bonus — every new signup is on the FREE plan at this exact
  // moment (subscription: { create: {} } in the same webhook defaults to
  // FREE), so this always applies to a fresh referral; it's additive to any
  // later recurring paid commission if they upgrade (see
  // createCommissionForPayment below), not an either/or.
  await grantFreeBonus(referral.id, referrer.id)
}

// Atomic, idempotent: the guarded updateMany only flips freeBonusGranted
// false→true for THIS referral, and the credit increment only runs if that
// flip actually happened — so a crash between the two statements rolls back
// the whole transaction (nothing granted), and a concurrent second call
// (whatever triggered it) sees the flag already true and grants nothing
// twice.
async function grantFreeBonus(referralId: string, referrerId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const result = await tx.referral.updateMany({
      where: { id: referralId, freeBonusGranted: false },
      data: { freeBonusGranted: true },
    })
    if (result.count === 0) return // already granted — no-op
    await tx.subscription.upsert({
      where: { userId: referrerId },
      create: { userId: referrerId, extraCredits: FREE_REFERRAL_BONUS_CREDITS },
      update: { extraCredits: { increment: FREE_REFERRAL_BONUS_CREDITS } },
    })
  })
}

// Creates a ReferralCommission for one payment event on a referred user's
// subscription (see subscription_payment_success in
// app/api/webhooks/lemonsqueezy). `sourceOrderId` must uniquely identify
// THIS specific billing-cycle charge (Lemon Squeezy's invoice/resource id) —
// the @unique constraint on it is what makes a webhook redelivery a clean
// no-op instead of a double payout. Returns "created" | "duplicate" | "no_referral"
// so the caller can log appropriately without this function needing to know
// about webhook logging conventions.
export async function createCommissionForPayment(params: {
  referredUserId: string
  sourceOrderId: string
  subtotalCents: number
  sourceEvent: string
}): Promise<"created" | "duplicate" | "no_referral"> {
  const referral = await db.referral.findUnique({
    where: { referredUserId: params.referredUserId },
    select: { referrerId: true },
  })
  if (!referral) return "no_referral"

  const amount = Math.round(params.subtotalCents * REFERRAL_COMMISSION_RATE) / 100

  const data: Prisma.ReferralCommissionCreateInput = {
    referrer: { connect: { id: referral.referrerId } },
    referredUserId: params.referredUserId,
    sourceOrderId: params.sourceOrderId,
    amount,
    sourceEvent: params.sourceEvent,
  }

  try {
    await db.referralCommission.create({ data })
    return "created"
  } catch (err) {
    // @unique(sourceOrderId) violation = Lemon Squeezy redelivered this
    // exact payment event (known to happen) — already processed, not an error.
    if (isUniqueConstraintError(err)) return "duplicate"
    throw err
  }
}

// Reverses a commission when its underlying payment is refunded — see
// STEP 6 in the referral program spec. Exported now so it's ready to wire up
// the moment a real refund webhook event is confirmed (see the gap noted in
// app/api/webhooks/lemonsqueezy/route.ts). Idempotent: reversing an
// already-reversed or already-paid-out commission is a deliberate no-op
// (this function only touches rows still "pending" so a payout that already
// went out is never silently clawed back here).
export async function reverseCommissionForOrder(
  sourceOrderId: string,
  reason: string,
): Promise<"reversed" | "not_found" | "not_pending"> {
  const commission = await db.referralCommission.findUnique({ where: { sourceOrderId } })
  if (!commission) return "not_found"
  if (commission.status !== "pending") return "not_pending"

  await db.referralCommission.update({
    where: { sourceOrderId },
    data: { status: "reversed", reversedAt: new Date(), reversedReason: reason },
  })
  return "reversed"
}
