// app/api/cron/publish-scheduled-emails/route.ts
// Runs every 5 min (see vercel.json) — same cadence and shape as
// publish-scheduled-posts:
//   0. Reclaim stuck "sending" rows — if the server crashed mid-send after a
//      row was claimed but before it resolved to sent/failed, it would
//      otherwise sit stuck forever. Anything still "sending" after 10
//      minutes gets reset to "queued" so the next tick retries it.
//   1. Send every due "queued" ScheduledEmail (recipient count re-resolved
//      fresh here, except "specific" intern IDs and a "custom" email list,
//      which were already frozen at schedule time — see the model comment
//      in prisma/schema.prisma).
// Per-recipient send failures are absorbed into sentCount/failedCount (the
// row still ends "sent"); only something that fails before any send is
// attempted (e.g. the recipient-resolution query itself throwing) marks the
// whole row "failed".
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { db } from "@/lib/db"
import { resolveRecipients, sendUserBroadcast, type BroadcastRecipients } from "@/lib/broadcast"
import { sendInternBroadcastEmails } from "@/lib/email"

export const maxDuration = 300

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

// Per-run safety cap — a 5-minute cadence should never realistically need
// more than this many broadcasts sent in one invocation.
const BATCH_LIMIT = 20
// How long a row can sit claimed ("sending") before we assume the worker
// that claimed it crashed and it's safe to hand back to the retry path —
// same value and role as publish-scheduled-posts' STUCK_PUBLISHING_MS.
const STUCK_SENDING_MS = 10 * 60 * 1000

// Both kinds go out in batches of 100 (lib/emailBatchSend.ts). The scheduled
// email's id keys each batch, so a run that's retried after a crash (the
// stuck-row reclaim above) never sends a batch Resend already took.
async function sendScheduledUserBroadcast(
  id: string,
  subject: string,
  body: string,
  recipientType: string,
  recipientIds: string[],
  recipientValue: string | null,
): Promise<{ sent: number; failed: number }> {
  // "custom" froze a raw email list at schedule time (see the ScheduledEmail
  // model comment) — resolveRecipients still looks each one up for a userId
  // so a scheduled broadcast personalizes exactly like an immediate one.
  const recipients =
    recipientType === "custom"
      ? await resolveRecipients(recipientIds)
      : await resolveRecipients(recipientType as BroadcastRecipients, recipientValue)
  const { sent, failed, error } = await sendUserBroadcast(resend, FROM, recipients, subject, body, `scheduled-${id}`)
  if (error) console.error(`[cron/publish-scheduled-emails] id=${id}: ${failed} not sent: ${error}`)
  return { sent, failed }
}

async function sendScheduledInternBroadcast(
  id: string,
  subject: string,
  body: string,
  recipientType: string,
  recipientIds: string[],
): Promise<{ sent: number; failed: number }> {
  const interns =
    recipientType === "all"
      ? await db.intern.findMany({ where: { active: true }, select: { id: true, name: true, email: true } })
      : await db.intern.findMany({
          where: { id: { in: recipientIds } },
          select: { id: true, name: true, email: true },
        })
  const { sent, failed, error } = await sendInternBroadcastEmails(interns, subject, body, `scheduled-${id}`)
  if (error) console.error(`[cron/publish-scheduled-emails] id=${id}: ${failed} not sent: ${error}`)
  return { sent, failed }
}

export async function GET(req: Request) {
  const now = new Date()

  // Secret gate — same convention as the other cron routes (Vercel Cron
  // sends `Authorization: Bearer <CRON_SECRET>`; a `?secret=` query param
  // covers manual runs). /api/cron(.*) is already exempted from Clerk's
  // auth.protect() in proxy.ts, so this route doesn't need its own entry
  // there — see the comment on that exemption for why it's needed at all.
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? new URL(req.url).searchParams.get("secret")
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const reclaimed = await db.scheduledEmail.updateMany({
    where: { status: "sending", updatedAt: { lt: new Date(now.getTime() - STUCK_SENDING_MS) } },
    data: { status: "queued" },
  })

  const due = await db.scheduledEmail.findMany({
    where: { status: "queued", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_LIMIT,
  })

  let processed = 0
  let failedRuns = 0

  for (const scheduled of due) {
    // Atomically claim the row before doing anything — guards against two
    // overlapping cron invocations both trying to send the same broadcast.
    const claim = await db.scheduledEmail.updateMany({
      where: { id: scheduled.id, status: "queued" },
      data: { status: "sending" },
    })
    if (claim.count === 0) continue // another run already claimed it

    try {
      const { sent, failed } =
        scheduled.type === "intern_broadcast"
          ? await sendScheduledInternBroadcast(
              scheduled.id,
              scheduled.subject,
              scheduled.body,
              scheduled.recipientType,
              scheduled.recipientIds,
            )
          : await sendScheduledUserBroadcast(
              scheduled.id,
              scheduled.subject,
              scheduled.body,
              scheduled.recipientType,
              scheduled.recipientIds,
              scheduled.recipientValue,
            )

      await db.scheduledEmail.update({
        where: { id: scheduled.id },
        data: { status: "sent", sentCount: sent, failedCount: failed },
      })
      processed++
    } catch (err) {
      console.error(`[cron/publish-scheduled-emails] failed id=${scheduled.id}:`, err)
      await db.scheduledEmail.update({ where: { id: scheduled.id }, data: { status: "failed" } })
      failedRuns++
    }
  }

  console.log(
    `[cron/publish-scheduled-emails] reclaimed=${reclaimed.count} due=${due.length} processed=${processed} failedRuns=${failedRuns}`,
  )
  return NextResponse.json({ ok: true, reclaimed: reclaimed.count, due: due.length, processed, failedRuns })
}
