// app/api/cron/publish-scheduled-posts/route.ts
// Runs every 5 min (see vercel.json). Three jobs share this one tick:
//   0. Reclaim stuck "publishing" rows — if the server crashed mid-request
//      after a row was claimed but before it resolved to published/queued/
//      failed, it would otherwise sit stuck forever. Anything still
//      "publishing" after 10 minutes gets reset to "queued" so the normal
//      retry path picks it back up.
//   1. Fulfill due RecurringSlots — a slot with no automation would be a
//      dead setting (create a rule, nothing ever happens), so this is what
//      actually turns "post automatically every Tue/Thu at 9am" into a real
//      queued ScheduledPost when that moment arrives.
//   2. Publish every due "queued" ScheduledPost (including ones jobs #0/#1
//      just created) via the same LinkedIn logic /api/linkedin/post uses,
//      with up to 3 total attempts 5 min apart and a failure email once
//      exhausted.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { postToLinkedIn } from "@/lib/linkedin"
import { sendScheduledPostFailedEmail } from "@/lib/email"

export const maxDuration = 300

// Total attempts allowed (the original try counts as attempt #1) before a
// post is marked "failed" for good and the user is emailed.
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 5 * 60 * 1000
// Per-run safety cap — a 5-minute cadence should never realistically need
// more than this many posts published in one invocation.
const BATCH_LIMIT = 50
// A slot fires once fired within the last 20h — comfortably longer than the
// 24h gap between two legitimate daily firings, so this is a safe re-fire
// guard without needing exact "start of local day" math per timezone.
const RECURRING_DEDUPE_MS = 20 * 60 * 60 * 1000
// How long a row can sit claimed ("publishing") before we assume the worker
// that claimed it crashed and it's safe to hand back to the normal retry path.
const STUCK_PUBLISHING_MS = 10 * 60 * 1000

// Emails are best-effort — a Resend hiccup must never crash the publish run.
async function safeEmail(fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (err) {
    console.error("[cron/publish-scheduled-posts] email failed:", err)
  }
}

// Reads a UTC instant's wall-clock weekday + "HH:mm" AS SEEN in `timeZone`
// (mirrors the same brute-force-free approach used by the suggestions route).
function getZonedWeekdayAndTime(date: Date, timeZone: string): { dayOfWeek: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const hour = map.hour === "24" ? "00" : map.hour
  return { dayOfWeek: weekdayMap[map.weekday] ?? date.getUTCDay(), hhmm: `${hour}:${map.minute}` }
}

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

// True once `nowHHmm` has reached `targetHHmm` and is still within the same
// 5-minute tick window — fires the slot exactly once per day.
function isDueNow(nowHHmm: string, targetHHmm: string): boolean {
  const diff = minutesSinceMidnight(nowHHmm) - minutesSinceMidnight(targetHHmm)
  return diff >= 0 && diff < 5
}

async function fulfillRecurringSlots(now: Date): Promise<number> {
  const slots = await db.recurringSlot.findMany({
    where: { active: true },
    include: { user: { include: { profile: true } } },
  })

  let created = 0
  for (const slot of slots) {
    const timeZone = slot.user.profile?.timezone || "UTC"
    let zoned: { dayOfWeek: number; hhmm: string }
    try {
      zoned = getZonedWeekdayAndTime(now, timeZone)
    } catch {
      zoned = getZonedWeekdayAndTime(now, "UTC") // invalid saved timezone — degrade to UTC
    }
    if (!slot.daysOfWeek.includes(zoned.dayOfWeek)) continue
    if (!isDueNow(zoned.hhmm, slot.timeOfDay)) continue

    const firedRecently = await db.scheduledPost.findFirst({
      where: { recurringRuleId: slot.id, createdAt: { gte: new Date(now.getTime() - RECURRING_DEDUPE_MS) } },
      select: { id: true },
    })
    if (firedRecently) continue

    if (slot.platform !== "linkedin") continue // instagram isn't connected yet

    // Most recent post that isn't already queued/published anywhere, so a
    // recurring slot never reposts the same content on repeat.
    const post = await db.post.findFirst({
      where: {
        userId: slot.userId,
        scheduledPosts: { none: { status: { in: ["queued", "publishing", "published"] } } },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    if (!post) continue // nothing unscheduled to fill this slot with today

    await db.scheduledPost.create({
      data: {
        userId: slot.userId,
        postId: post.id,
        platform: slot.platform,
        scheduledFor: now,
        status: "queued",
        recurringRuleId: slot.id,
      },
    })
    created++
  }
  return created
}

export async function GET(req: Request) {
  const now = new Date()
  // TEMP DIAGNOSTIC — remove once cron firing is confirmed healthy in
  // production logs. Logs booleans only, never the actual secret value.
  console.log(`[cron/publish-scheduled-posts] invoked at ${now.toISOString()}`)

  // Secret gate — same convention as the other cron routes (Vercel Cron
  // sends `Authorization: Bearer <CRON_SECRET>`; a `?secret=` query param
  // covers manual runs).
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? new URL(req.url).searchParams.get("secret")
  const authorized = !!secret && provided === secret
  // TEMP DIAGNOSTIC — this line alone will tell us if CRON_SECRET is even
  // set in this environment, which is the #1 suspect for a cron that never
  // fires: cronSecretSet=false means every invocation, including Vercel's
  // own, gets rejected here before anything else in this file ever runs.
  console.log(
    `[cron/publish-scheduled-posts] auth check: cronSecretSet=${!!secret} authHeaderPresent=${!!bearer} authorized=${authorized}`,
  )
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Job #0 — reclaim anything stuck "publishing" from a crashed prior run
  // before doing anything else, so it's eligible for job #2 below in this
  // same tick rather than sitting stuck indefinitely.
  const reclaimed = await db.scheduledPost.updateMany({
    where: { status: "publishing", updatedAt: { lt: new Date(now.getTime() - STUCK_PUBLISHING_MS) } },
    data: { status: "queued" },
  })
  // TEMP DIAGNOSTIC
  console.log(`[cron/publish-scheduled-posts] reclaimed ${reclaimed.count} stuck "publishing" row(s)`)

  // Job #1, so anything it creates gets picked up by job #2 below in this
  // same tick instead of waiting another 5 minutes.
  const recurringCreated = await fulfillRecurringSlots(now)
  // TEMP DIAGNOSTIC
  console.log(`[cron/publish-scheduled-posts] recurring slots created ${recurringCreated} new queued post(s)`)

  const due = await db.scheduledPost.findMany({
    where: { status: "queued", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_LIMIT,
    include: {
      post: true,
      user: { include: { linkedIn: true, profile: true } },
    },
  })

  // TEMP DIAGNOSTIC — the key visibility the user asked for: exactly what
  // the due-post query found (or didn't) on this tick, before any publish
  // attempt runs.
  console.log(`[cron/publish-scheduled-posts] found ${due.length} due post(s)`)
  for (const d of due) {
    console.log(
      `[cron/publish-scheduled-posts]   due id=${d.id} status=${d.status} platform=${d.platform} scheduledFor=${d.scheduledFor.toISOString()} retryCount=${d.retryCount} linkedInConnected=${!!d.user.linkedIn}`,
    )
  }

  let published = 0
  let retried = 0
  let failed = 0

  for (const scheduled of due) {
    // Atomically claim the row before doing anything — guards against two
    // overlapping cron invocations both trying to publish the same post.
    const claim = await db.scheduledPost.updateMany({
      where: { id: scheduled.id, status: "queued" },
      data: { status: "publishing" },
    })
    if (claim.count === 0) continue // another run already claimed it

    const { post, user } = scheduled
    const name = user.profile?.name ?? ""

    try {
      if (scheduled.platform !== "linkedin") {
        // Only linkedin can ever reach "queued" today (see
        // app/api/content-hub/scheduled/route.ts), but guard here too in
        // case that changes without this worker being updated in lockstep.
        throw new Error("Instagram isn't connected yet")
      }
      if (!user.linkedIn) {
        throw new Error("LinkedIn isn't connected")
      }
      if (user.linkedIn.expiresAt && user.linkedIn.expiresAt.getTime() < Date.now()) {
        throw new Error("LinkedIn connection expired — please reconnect")
      }

      const { postUrl } = await postToLinkedIn(
        user.linkedIn.accessToken,
        user.linkedIn.linkedInId,
        post.caption ?? "",
        post.imageUrls,
      )

      await db.$transaction([
        db.scheduledPost.update({
          where: { id: scheduled.id },
          data: { status: "published", publishedUrl: postUrl, failureReason: null },
        }),
        db.post.update({
          where: { id: post.id },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        }),
      ])
      published++
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Failed to publish"
      const nextAttempt = scheduled.retryCount + 1

      if (nextAttempt < MAX_ATTEMPTS) {
        await db.scheduledPost.update({
          where: { id: scheduled.id },
          data: {
            status: "queued",
            retryCount: nextAttempt,
            failureReason: reason,
            scheduledFor: new Date(Date.now() + RETRY_DELAY_MS),
          },
        })
        retried++
      } else {
        await db.scheduledPost.update({
          where: { id: scheduled.id },
          data: { status: "failed", retryCount: nextAttempt, failureReason: reason },
        })
        failed++
        if (user.email) {
          await safeEmail(() =>
            sendScheduledPostFailedEmail(user.email, name, post.title, scheduled.platform, reason),
          )
        }
      }
      console.error(`[cron/publish-scheduled-posts] failed id=${scheduled.id}:`, reason)
    }
  }

  console.log(
    `[cron/publish-scheduled-posts] reclaimed=${reclaimed.count} recurringCreated=${recurringCreated} due=${due.length} published=${published} retried=${retried} failed=${failed}`,
  )
  return NextResponse.json({
    ok: true,
    reclaimed: reclaimed.count,
    recurringCreated,
    due: due.length,
    published,
    retried,
    failed,
  })
}
