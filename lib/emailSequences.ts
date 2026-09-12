// lib/emailSequences.ts
// Segment matching + enrollment for EmailSequence drip campaigns. Two call
// sites: the Clerk webhook (instant enrollment for brand-new signups) and
// the periodic sweep in app/api/cron/process-email-sequences (the backstop —
// catches segment changes over time, like a FREE user upgrading into a
// "pro" sequence, and sequences created/activated after matching users
// already existed).
import { db } from "@/lib/db"
import type { Plan } from "@prisma/client"
import { availableCredits } from "@/lib/credits"

const DEFAULT_INACTIVE_DAYS = 30
const DEFAULT_CREDIT_THRESHOLD = 100

// Same segment vocabulary as lib/broadcast.ts's resolveRecipients (see
// lib/segments.ts for the shared UI catalog both draw from), but as a
// per-user boolean check rather than a recipient list — enrollment needs to
// ask "does THIS user match?", not "who matches?". Async because the
// extended segments (inactive/zero_referrals/no_content/low_credits) need
// their own queries beyond the plan already fetched by the caller.
export async function matchesSegment(
  user: { id: string; deletedAt: Date | null; updatedAt: Date },
  subscriptionPlan: Plan | null,
  segmentType: string,
  segmentValue: string | null,
): Promise<boolean> {
  if (user.deletedAt) return false

  if (segmentType === "all") return true
  const plan = subscriptionPlan ?? "FREE"
  if (segmentType === "pro") return plan === "PRO"
  if (segmentType === "growth") return plan === "GROWTH"
  if (segmentType === "free") return plan === "FREE"

  // Reuses the same updatedAt-as-last-activity convention the admin user
  // detail page already displays — no dedicated last-activity field exists.
  if (segmentType === "inactive") {
    const days = Number(segmentValue) > 0 ? Number(segmentValue) : DEFAULT_INACTIVE_DAYS
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return user.updatedAt < cutoff
  }

  if (segmentType === "zero_referrals") {
    const count = await db.referral.count({ where: { referrerId: user.id } })
    return count === 0
  }

  if (segmentType === "no_content") {
    const count = await db.post.count({ where: { userId: user.id } })
    return count === 0
  }

  if (segmentType === "low_credits") {
    const threshold = Number(segmentValue) > 0 ? Number(segmentValue) : DEFAULT_CREDIT_THRESHOLD
    const sub = await db.subscription.findUnique({ where: { userId: user.id } })
    if (!sub) return true // no subscription row at all reads as "0 credits available"
    return availableCredits(sub) < threshold
  }

  return false
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  )
}

// Enrolls one user into every currently-active sequence they match and
// aren't already enrolled in. The @@unique([sequenceId, userId]) makes
// "aren't already enrolled" race-safe via try/catch (same pattern as
// lib/referral.ts's createReferralForSignup) rather than a separate
// existence check + insert. Returns how many new enrollments were created.
export async function enrollUserInMatchingSequences(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: { select: { plan: true } } },
  })
  if (!user) return 0

  const sequences = await db.emailSequence.findMany({
    where: { active: true },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  })

  let enrolled = 0
  for (const seq of sequences) {
    const matches = await matchesSegment(user, user.subscription?.plan ?? null, seq.segmentType, seq.segmentValue)
    if (!matches) continue
    if (seq.steps.length === 0) continue // nothing to send yet

    // 50/50 only when at least one step actually has a B variant defined —
    // otherwise every enrollment is "A" so a sequence with no A/B content
    // never wastes a coin flip on it.
    const hasAnyBVariant = seq.steps.some((s) => s.subjectB || s.bodyB)
    const variant = hasAnyBVariant && Math.random() < 0.5 ? "B" : "A"

    try {
      await db.emailSequenceEnrollment.create({
        data: {
          sequenceId: seq.id,
          userId,
          variant,
          nextSendAt: new Date(), // step 1's delayDays is always 0 — send now
        },
      })
      enrolled++
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err // else: already enrolled, skip
    }
  }
  return enrolled
}

// Checked by the cron immediately before sending each due step. Only
// "upgraded" is backed by a real signal today — see the stopRule field's
// schema comment for why a "replied to Support" rule isn't offered.
export async function shouldStopForRule(stopRule: string | null, userId: string): Promise<boolean> {
  if (stopRule === "upgraded") {
    const sub = await db.subscription.findUnique({ where: { userId }, select: { plan: true } })
    return sub?.plan === "PRO" || sub?.plan === "GROWTH"
  }
  return false
}
