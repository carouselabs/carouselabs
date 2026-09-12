// app/api/cron/process-email-sequences/route.ts
// Runs hourly (see vercel.json) — day-granularity delayDays doesn't need
// 5-minute precision like the ScheduledEmail cron does, and a slower cadence
// keeps Phase 1's full-user sweep cheap. Two phases per tick:
//
//   Phase 1 — sweep: catches segment changes since the last tick (a FREE
//   user upgrading into a "pro" sequence) and sequences created/activated
//   after users who already match them existed. Brand-new signups are also
//   enrolled instantly by the Clerk webhook — this is their backstop, not
//   the primary path.
//
//   Phase 2 — send: every "active" enrollment whose nextSendAt is due gets
//   its stop rule checked first, then (if not stopped) its current step
//   sent with resolved variables + its A/B variant, then advances to the
//   next step or completes.
//
// Both phases are capped (see the spec's Step 8) — a sudden backlog spreads
// across ticks instead of bursting in one run.
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { db } from "@/lib/db"
import { enrollUserInMatchingSequences, shouldStopForRule } from "@/lib/emailSequences"
import { applyVariables, renderBroadcastEmailHtml } from "@/lib/broadcastRender"
import { resolveVariables } from "@/lib/broadcastVariables"

export const maxDuration = 300

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

const SEND_BATCH_LIMIT = 100
// A brand-new or newly-reactivated sequence could match a very large
// existing user base — each fresh enrollment's first step sends THIS run
// (nextSendAt = now), so this cap also bounds how many first-sends one tick
// can trigger. NOTE: this scans every non-deleted user every tick — fine at
// this app's current scale, but if the user base grows large enough for
// that full scan to matter, this should move to only checking users whose
// plan/segment-relevant state changed since the last sweep.
const SWEEP_BATCH_LIMIT = 500
// The instant an enrollment is picked up, its nextSendAt is bumped this far
// forward as an atomic "claim" — guards two overlapping cron invocations
// from both sending the same step. Reset to the real next value (or left
// alone on completion) once the send actually finishes; left AT the claim
// horizon on a failed send, so a persistently-failing recipient retries on
// a delay instead of hot-looping every tick.
const CLAIM_HORIZON_MS = 30 * 60 * 1000

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? new URL(req.url).searchParams.get("secret")
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Phase 1: sweep ──
  const activeSequenceCount = await db.emailSequence.count({ where: { active: true } })
  let sweepEnrolled = 0
  if (activeSequenceCount > 0) {
    const candidateUsers = await db.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: SWEEP_BATCH_LIMIT,
    })
    for (const u of candidateUsers) {
      sweepEnrolled += await enrollUserInMatchingSequences(u.id)
    }
  }

  // ── Phase 2: send due steps ──
  const now = new Date()
  const due = await db.emailSequenceEnrollment.findMany({
    where: { status: "active", nextSendAt: { lte: now } },
    include: { sequence: { include: { steps: { orderBy: { stepOrder: "asc" } } } } },
    orderBy: { nextSendAt: "asc" },
    take: SEND_BATCH_LIMIT,
  })

  let sent = 0
  let completed = 0
  let stoppedByRule = 0
  let failed = 0

  for (const enrollment of due) {
    // Atomic claim — only proceeds if this row is still due at this exact
    // instant (guards overlapping cron runs).
    const claim = await db.emailSequenceEnrollment.updateMany({
      where: { id: enrollment.id, status: "active", nextSendAt: { lte: now } },
      data: { nextSendAt: new Date(now.getTime() + CLAIM_HORIZON_MS) },
    })
    if (claim.count === 0) continue // another run already claimed it

    try {
      if (await shouldStopForRule(enrollment.sequence.stopRule, enrollment.userId)) {
        await db.emailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "exited_by_rule" },
        })
        stoppedByRule++
        continue
      }

      const step = enrollment.sequence.steps[enrollment.currentStep]
      if (!step) {
        // currentStep points past the last step — can happen if steps were
        // edited out from under an active enrollment (the builder warns
        // about this). Nothing left to send; treat as completed rather than
        // erroring forever on the same missing index.
        await db.emailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed" },
        })
        completed++
        continue
      }

      const useB = enrollment.variant === "B"
      const subjectTemplate = (useB && step.subjectB) || step.subject
      const bodyTemplate = (useB && step.bodyB) || step.body

      const variables = await resolveVariables(enrollment.userId)
      const finalSubject = applyVariables(subjectTemplate, variables)
      const finalBody = applyVariables(bodyTemplate, variables)

      const { data: sendResult, error } = await resend.emails.send({
        from: FROM,
        to: variables.email,
        subject: finalSubject,
        html: renderBroadcastEmailHtml(finalSubject, finalBody),
      })
      if (error) throw new Error(error.message)

      // resendEmailId is what app/api/webhooks/resend uses to correlate a
      // later "opened"/"clicked"/"bounced" event back to this exact send.
      await db.emailEngagement.create({
        data: {
          sequenceId: enrollment.sequenceId,
          stepId: step.id,
          userId: enrollment.userId,
          event: "sent",
          resendEmailId: sendResult?.id ?? null,
        },
      })

      const nextStep = enrollment.sequence.steps[enrollment.currentStep + 1]
      if (nextStep) {
        const nextSendAt = new Date()
        nextSendAt.setDate(nextSendAt.getDate() + nextStep.delayDays)
        await db.emailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStep: enrollment.currentStep + 1, nextSendAt, lastSentAt: new Date() },
        })
      } else {
        await db.emailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "completed", lastSentAt: new Date() },
        })
        completed++
      }
      sent++
    } catch (err) {
      console.error(`[cron/process-email-sequences] send failed for enrollment ${enrollment.id}:`, err)
      failed++
      // nextSendAt is intentionally left at the claim horizon set above — a
      // persistently-failing send (e.g. Resend outage) retries in 30 min
      // rather than every hourly tick reprocessing an immediate failure.
    }
  }

  console.log(
    `[cron/process-email-sequences] sweepEnrolled=${sweepEnrolled} due=${due.length} sent=${sent} completed=${completed} stoppedByRule=${stoppedByRule} failed=${failed}`,
  )
  return NextResponse.json({
    ok: true,
    sweepEnrolled,
    due: due.length,
    sent,
    completed,
    stoppedByRule,
    failed,
  })
}
