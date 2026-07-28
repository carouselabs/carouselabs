// scripts/test-webhook-trial-fix.ts
//
// Quick sanity check for the credit-reset-on-trial fix in
// app/api/webhooks/lemonsqueezy/route.ts. Re-implements the exact isPaid /
// shouldResetCredits boolean logic the route uses and runs it against mock
// statuses, so the fix can be verified without waiting for a real (or
// sandbox) Lemon Squeezy webhook.
//
// Read-only: Part 3 only SELECTs a subscription row if you opt in via
// TEST_USER_ID — this script never writes to the database.
//
// Run with:            npx tsx scripts/test-webhook-trial-fix.ts
// Optionally, to also eyeball a real row:
//   TEST_USER_ID=<your db user id> npx tsx scripts/test-webhook-trial-fix.ts

import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import { db } from "../lib/db"

// Mirrors `const isPaid = attrs.status === "active"` from both
// subscription_created and subscription_updated in the webhook route.
// Keep this in sync if that logic ever changes.
function isPaidStatus(status: string | undefined): boolean {
  return status === "active"
}

// Mirrors subscription_updated's:
//   const shouldResetCredits = planChanged && isPaid && !isScheduledUpgrade
function shouldResetCredits(
  planChanged: boolean,
  status: string | undefined,
  isScheduledUpgrade: boolean,
): boolean {
  return planChanged && isPaidStatus(status) && !isScheduledUpgrade
}

let failures = 0

function check(label: string, actual: boolean, expected: boolean) {
  const pass = actual === expected
  if (!pass) failures++
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}: expected ${expected}, got ${actual}`)
}

async function main() {
  console.log("── Part 1: isPaid logic (subscription_created / subscription_updated) ──")
  // The bug: subscription_created used to hardcode status: "ACTIVE" and
  // grant full credits regardless of what Lemon Squeezy actually reported.
  check("on_trial must NOT be treated as paid", isPaidStatus("on_trial"), false)
  check("past_due must NOT be treated as paid", isPaidStatus("past_due"), false)
  check("unpaid must NOT be treated as paid", isPaidStatus("unpaid"), false)
  check("cancelled must NOT be treated as paid", isPaidStatus("cancelled"), false)
  check("expired must NOT be treated as paid", isPaidStatus("expired"), false)
  check("paused must NOT be treated as paid", isPaidStatus("paused"), false)
  check("missing status must NOT be treated as paid", isPaidStatus(undefined), false)
  check("active MUST be treated as paid", isPaidStatus("active"), true)

  console.log("\n── Part 2: shouldResetCredits logic (subscription_updated) ──")
  // A plan change alone isn't enough — it also needs a real "active" status
  // and must not be a deferred (scheduled) upgrade held for renewal.
  check(
    "plan changed + on_trial → credits NOT reset",
    shouldResetCredits(true, "on_trial", false),
    false,
  )
  check(
    "plan changed + active + scheduled upgrade → credits NOT reset (held for renewal)",
    shouldResetCredits(true, "active", true),
    false,
  )
  check(
    "plan changed + active + not scheduled → credits reset",
    shouldResetCredits(true, "active", false),
    true,
  )
  check(
    "no plan change → credits NOT reset regardless of status",
    shouldResetCredits(false, "active", false),
    false,
  )

  console.log("\n── Part 3: optional live read against a real subscription ──")
  const testUserId = process.env.TEST_USER_ID
  if (!testUserId) {
    console.log(
      "Skipped — no TEST_USER_ID env var set. This part only READS a subscription row " +
        "(never writes) so you can eyeball real creditsTotal/creditsUsed/plan/status. " +
        "Set TEST_USER_ID=<your db user id> to include it.",
    )
  } else {
    const sub = await db.subscription.findUnique({
      where: { userId: testUserId },
      select: { creditsUsed: true, creditsTotal: true, plan: true, status: true },
    })
    if (!sub) {
      console.log(`No subscription row found for userId=${testUserId} — check the id and try again.`)
    } else {
      console.log("Current subscription row (read-only, untouched by this script):", sub)
    }
  }

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`)
  await db.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error("Test script crashed:", err)
  process.exit(1)
})
