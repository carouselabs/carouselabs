// scripts/audit-payment-system.ts
//
// Comprehensive sanity check for the payment/credit system. Two testing
// strategies are used, and each section says which one applies:
//
//   REAL IMPORT    — the actual exported function from lib/ is imported and
//                    called directly. Zero drift risk.
//   REIMPLEMENTATION — the logic lives inline inside
//                    app/api/webhooks/lemonsqueezy/route.ts and isn't
//                    exported, so it's mirrored here. Keep in sync manually
//                    if that file's logic changes.
//
// Read-only except Section 7, which inserts one throwaway row into
// ProcessedWebhookEvent and deletes it in a `finally` — safe, self-cleaning,
// uses a random id that can't collide with anything real.
//
// Run with: npx tsx scripts/audit-payment-system.ts

import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import crypto from "node:crypto"
import { db } from "../lib/db"
import { planForVariantId, creditsForPlan, PRO_MONTHLY_CREDITS, GROWTH_MONTHLY_CREDITS } from "../lib/lemonsqueezy"
import { availableCredits, extraCreditsValid } from "../lib/credits"

let failures = 0

function check(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (!pass) failures++
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

function section(title: string) {
  console.log(`\n═══ ${title} ═══`)
}

// ── REIMPLEMENTATION — mirrors app/api/webhooks/lemonsqueezy/route.ts ──
function isPaidStatus(status: string | undefined): boolean {
  return status === "active"
}

function mapStatus(status?: string): string {
  switch (status) {
    case "on_trial":
      return "TRIALING"
    case "cancelled":
      return "CANCELLED"
    case "past_due":
    case "unpaid":
      return "PAST_DUE"
    case "expired":
      return "EXPIRED"
    default:
      return "ACTIVE"
  }
}

function shouldResetCredits(
  planChanged: boolean,
  status: string | undefined,
  isScheduledUpgrade: boolean,
): boolean {
  return planChanged && isPaidStatus(status) && !isScheduledUpgrade
}

// Mirrors handleTopUpOrder's credit math + bounds check.
function topUpCreditsFromCents(amountPaidCents: number): number | null {
  const amountPaidDollars = amountPaidCents / 100
  const creditsToGrant = Math.floor(amountPaidDollars / 2) * 100
  if (creditsToGrant < 100 || creditsToGrant > 5000 || creditsToGrant % 100 !== 0) return null
  return creditsToGrant
}

async function main() {
  section("1. isPaid gate — subscription_created / subscription_updated (REIMPLEMENTATION)")
  check("on_trial must NOT be treated as paid", isPaidStatus("on_trial"), false)
  check("past_due must NOT be treated as paid", isPaidStatus("past_due"), false)
  check("unpaid must NOT be treated as paid", isPaidStatus("unpaid"), false)
  check("cancelled must NOT be treated as paid", isPaidStatus("cancelled"), false)
  check("expired must NOT be treated as paid", isPaidStatus("expired"), false)
  check("paused must NOT be treated as paid", isPaidStatus("paused"), false)
  check("missing status must NOT be treated as paid", isPaidStatus(undefined), false)
  check("active MUST be treated as paid", isPaidStatus("active"), true)

  section("2. shouldResetCredits — subscription_updated, incl. scheduled-upgrade hold (REIMPLEMENTATION)")
  check("plan changed + on_trial → credits NOT reset", shouldResetCredits(true, "on_trial", false), false)
  check(
    "plan changed + active + scheduled upgrade → credits NOT reset (held for renewal)",
    shouldResetCredits(true, "active", true),
    false,
  )
  check("plan changed + active + not scheduled → credits reset", shouldResetCredits(true, "active", false), true)
  check(
    "no plan change → credits NOT reset regardless of status",
    shouldResetCredits(false, "active", false),
    false,
  )
  check(
    "plan changed + past_due + scheduled upgrade → still NOT reset (both guards independently block it)",
    shouldResetCredits(true, "past_due", true),
    false,
  )

  section("3. mapStatus — every known Lemon Squeezy status (REIMPLEMENTATION)")
  check("on_trial → TRIALING", mapStatus("on_trial"), "TRIALING")
  check("cancelled → CANCELLED", mapStatus("cancelled"), "CANCELLED")
  check("past_due → PAST_DUE", mapStatus("past_due"), "PAST_DUE")
  check("unpaid → PAST_DUE", mapStatus("unpaid"), "PAST_DUE")
  check("expired → EXPIRED", mapStatus("expired"), "EXPIRED")
  check("active → ACTIVE", mapStatus("active"), "ACTIVE")
  console.log(
    'NOTE (not a pass/fail): "paused" has no dedicated case, falls through to default "ACTIVE" — ' +
      "there is no PAUSED value in the SubscriptionStatus Prisma enum to map it to. isPaid is unaffected " +
      "(it checks the raw string directly, not mapStatus's output), so this only affects the status column's display.",
  )

  section("4. planForVariantId / creditsForPlan — REAL functions imported from lib/lemonsqueezy.ts")
  const proVariantId = parseInt(process.env.LEMONSQUEEZY_VARIANT_ID ?? "0", 10)
  const growthVariantId = parseInt(process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID ?? "0", 10)
  if (proVariantId) {
    check("configured Pro variant id → PRO", planForVariantId(proVariantId), "PRO")
  } else {
    console.log("SKIPPED — LEMONSQUEEZY_VARIANT_ID not set in this environment")
  }
  if (growthVariantId) {
    check("configured Growth variant id → GROWTH", planForVariantId(growthVariantId), "GROWTH")
  } else {
    console.log("SKIPPED — LEMONSQUEEZY_GROWTH_VARIANT_ID not set in this environment")
  }
  check("unknown variant id → PRO (documented fail-open default, logs loudly)", planForVariantId(999999999), "PRO")
  check("undefined variant id → PRO (documented fail-open default, logs loudly)", planForVariantId(undefined), "PRO")
  check("creditsForPlan(PRO) matches PRO_MONTHLY_CREDITS", creditsForPlan("PRO"), PRO_MONTHLY_CREDITS)
  check("creditsForPlan(GROWTH) matches GROWTH_MONTHLY_CREDITS", creditsForPlan("GROWTH"), GROWTH_MONTHLY_CREDITS)
  console.log(
    'NOTE: top-up variant is NOT resolved through planForVariantId at all — it is compared directly against ' +
      "LEMONSQUEEZY_TOPUP_VARIANT_ID inside handleTopUpOrder, since a top-up is a one-time order, not a plan. " +
      "That's correct by design, not a gap.",
  )

  section("5. Top-up order credit math — REIMPLEMENTATION of handleTopUpOrder's math")
  check("$2.00 → 100 credits", topUpCreditsFromCents(200), 100)
  check("$10.00 → 500 credits", topUpCreditsFromCents(1000), 500)
  check("$1.99 → rejected (below 100-credit minimum)", topUpCreditsFromCents(199), null)
  check("$250.00 → rejected (above 5000-credit cap)", topUpCreditsFromCents(25000), null)
  // creditsToGrant is CONSTRUCTED as (integer) * 100, so it is always a clean
  // multiple of 100 by definition — the `% 100 !== 0` guard in the real code
  // can never actually trigger. A non-$2-multiple payment (e.g. $2.50) rounds
  // DOWN to the nearest $2 increment instead of being rejected — worth being
  // aware of (a $0.50 partial-refund adjustment or odd coupon amount silently
  // grants less than the customer paid for), but it's the real, intended
  // behavior, not a bug.
  check("$2.50 → rounds DOWN to 100 credits (not rejected)", topUpCreditsFromCents(250), 100)
  check("$3.99 → rounds DOWN to 100 credits", topUpCreditsFromCents(399), 100)

  section("6. availableCredits / extraCreditsValid — REAL functions imported from lib/credits.ts")
  check(
    "FREE user, 0 used → 1 available",
    availableCredits({ plan: "FREE", creditsUsed: 0, creditsTotal: 0, extraCredits: 0, extraCreditsExpiry: null }),
    1,
  )
  check(
    "FREE user, 1 used → 0 available (lifetime post spent)",
    availableCredits({ plan: "FREE", creditsUsed: 1, creditsTotal: 0, extraCredits: 0, extraCreditsExpiry: null }),
    0,
  )
  check(
    "FREE user, lifetime post spent + 200 admin-granted extraCredits → 200 available",
    availableCredits({ plan: "FREE", creditsUsed: 1, creditsTotal: 0, extraCredits: 200, extraCreditsExpiry: null }),
    200,
  )
  check(
    "FREE user, lifetime post spent + EXPIRED extraCredits → 0 available",
    availableCredits({
      plan: "FREE",
      creditsUsed: 1,
      creditsTotal: 0,
      extraCredits: 200,
      extraCreditsExpiry: new Date(Date.now() - 86400000),
    }),
    0,
  )
  check(
    "PRO user, half of 1000 used → 500 remaining",
    availableCredits({ plan: "PRO", creditsUsed: 500, creditsTotal: 1000, extraCredits: 0, extraCreditsExpiry: null }),
    500,
  )
  check(
    "PRO user, monthly drained + unexpired extras → extras count",
    availableCredits({
      plan: "PRO",
      creditsUsed: 1000,
      creditsTotal: 1000,
      extraCredits: 200,
      extraCreditsExpiry: new Date(Date.now() + 86400000),
    }),
    200,
  )
  check(
    "PRO user, monthly drained + EXPIRED extras → extras excluded",
    availableCredits({
      plan: "PRO",
      creditsUsed: 1000,
      creditsTotal: 1000,
      extraCredits: 200,
      extraCreditsExpiry: new Date(Date.now() - 86400000),
    }),
    0,
  )
  check(
    "extraCreditsValid: no expiry set → valid forever",
    extraCreditsValid({ extraCredits: 50, extraCreditsExpiry: null }),
    true,
  )
  check(
    "extraCreditsValid: zero extra credits → invalid regardless of expiry",
    extraCreditsValid({ extraCredits: 0, extraCreditsExpiry: null }),
    false,
  )

  section("7. Idempotency — REAL DB unique-constraint check (self-cleaning, safe)")
  const testEventId = `AUDIT_TEST_${crypto.randomUUID()}`
  let dbUnreachable = false
  try {
    await db.processedWebhookEvent.create({ data: { eventId: testEventId, source: "audit-script" } })
    let duplicateBlocked = false
    try {
      await db.processedWebhookEvent.create({ data: { eventId: testEventId, source: "audit-script" } })
    } catch {
      duplicateBlocked = true
    }
    check("a second create() with the same eventId is rejected by the unique constraint", duplicateBlocked, true)
  } catch (err) {
    // A connection failure means the environment can't reach the DB — that's
    // not a defect in the idempotency logic itself, so it's a SKIP, not a
    // FAIL. Any other error here (e.g. a schema mismatch) is a real failure.
    const message = err instanceof Error ? err.message : String(err)
    dbUnreachable = /Can't reach database server|ECONNREFUSED|PrismaClientInitializationError/i.test(message)
    if (dbUnreachable) {
      console.log(
        "SKIPPED — could not reach the database from this environment, so the live unique-constraint " +
          "check couldn't run. This is an environment limitation, not evidence of a code defect: the " +
          "`eventId String @unique` constraint in prisma/schema.prisma (ProcessedWebhookEvent model) is " +
          "what enforces this in production, and it's a real Postgres unique index, not app-level logic " +
          "that could silently be wrong.",
      )
    } else {
      failures++
      console.log(`FAIL — idempotency check crashed unexpectedly: ${message}`)
    }
  } finally {
    if (!dbUnreachable) {
      await db.processedWebhookEvent.delete({ where: { eventId: testEventId } }).catch(() => {})
    }
  }

  section("8. Known gaps found by this audit (informational — not pass/fail, not fixed here)")
  console.log(
    "- No `subscription_expired` case in the webhook switch. If Lemon Squeezy sends subscription_updated\n" +
      "  alongside it, the `status` column self-heals via mapStatus() — but `plan` and credits are NEVER\n" +
      "  downgraded to FREE when a subscription actually expires. Nothing in this codebase does that downgrade.",
  )
  console.log(
    "- lib/credits.ts's availableCredits()/hasGenerationBalance() key off `plan` only, never `status`. A\n" +
      "  CANCELLED or EXPIRED PRO/GROWTH user keeps spending their remaining credits until the pool empties,\n" +
      "  since nothing zeroes creditsTotal/creditsUsed or flips plan back to FREE on expiry.",
  )
  console.log(
    "- subscription_updated never resets `cancelAtPeriodEnd` back to false, so a customer who un-cancels via\n" +
      "  the Lemon Squeezy customer portal will keep showing as \"will cancel on [date]\" in our own UI.",
  )

  section("RESULT")
  console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`)
  await db.$disconnect().catch(() => {})
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Audit script crashed:", err)
  process.exit(1)
})
