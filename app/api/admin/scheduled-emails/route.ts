// GET  /api/admin/scheduled-emails — list every scheduled email (both
//       intern_broadcast and user_broadcast), newest scheduledFor first.
// POST /api/admin/scheduled-emails — queue a new scheduled email. Shared by
//       both broadcast composers' "Schedule for Later" mode; "Send Now"
//       still goes through their existing routes unchanged.
//   body: { type: "intern_broadcast" | "user_broadcast", subject, body,
//            recipientType, recipientIds?, scheduledFor, dryRun? }
//   dryRun: true → resolve + count recipients only, nothing is created
//
// Applies the SAME rate limits as the immediate-send routes, at schedule
// time rather than send time — otherwise "Schedule for Later" would be a
// free way around the hourly abuse-prevention limit.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { resolveRecipients, type BroadcastRecipients } from "@/lib/broadcast"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const MAX_USER_RECIPIENTS = 5000

// Same config/key as app/api/admin/broadcasts — a separately-instantiated
// Ratelimit with an identical Redis connection + key shares the same
// underlying bucket, so this really is the same one-per-hour budget.
const userRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1, "1 h"),
  analytics: false,
})
// Same config/key as app/api/admin/interns/broadcast.
const internRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: false,
})

type ScheduleType = "intern_broadcast" | "user_broadcast"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const scheduledEmails = await db.scheduledEmail.findMany({
    orderBy: { scheduledFor: "desc" },
  })
  return NextResponse.json({ scheduledEmails })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let type: ScheduleType
  let subject: string
  let body: string
  let recipientType: string
  let recipientIds: string[] = []
  let scheduledFor: Date
  let dryRun = false
  try {
    const json = await req.json()
    if (json.type !== "intern_broadcast" && json.type !== "user_broadcast") throw new Error()
    type = json.type
    subject = String(json.subject ?? "").trim()
    body = String(json.body ?? "").trim()
    dryRun = json.dryRun === true

    if (type === "intern_broadcast") {
      if (json.recipientType === "all") {
        recipientType = "all"
      } else if (json.recipientType === "specific") {
        if (!Array.isArray(json.recipientIds) || json.recipientIds.length === 0) throw new Error()
        if (!json.recipientIds.every((v: unknown) => typeof v === "string")) throw new Error()
        recipientType = "specific"
        recipientIds = json.recipientIds
      } else {
        throw new Error()
      }
    } else {
      if (!["all", "pro", "growth", "free", "custom"].includes(json.recipientType)) throw new Error()
      recipientType = json.recipientType
      if (recipientType === "custom") {
        if (!Array.isArray(json.recipientIds) || json.recipientIds.length === 0) throw new Error()
        if (!json.recipientIds.every((v: unknown) => typeof v === "string")) throw new Error()
        recipientIds = json.recipientIds
      }
    }

    if (!subject || !body) throw new Error()

    const parsed = new Date(json.scheduledFor)
    if (Number.isNaN(parsed.getTime())) throw new Error()
    scheduledFor = parsed
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (scheduledFor.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 })
  }

  // Resolve now purely to validate + report a count. The cron worker
  // re-resolves fresh at send time for anything other than "specific"
  // intern IDs or a "custom" email list, since tier/roster membership can
  // shift between now and scheduledFor.
  let count: number
  if (type === "intern_broadcast") {
    count =
      recipientType === "all"
        ? await db.intern.count({ where: { active: true } })
        : await db.intern.count({ where: { id: { in: recipientIds } } })
  } else {
    const resolved =
      recipientType === "custom"
        ? await resolveRecipients(recipientIds)
        : await resolveRecipients(recipientType as BroadcastRecipients)
    count = resolved.length
    if (recipientType === "custom") recipientIds = resolved // normalized (deduped/lowercased)
  }

  if (count === 0) {
    return NextResponse.json({ error: "No recipients match that selection" }, { status: 400 })
  }
  if (type === "user_broadcast" && count > MAX_USER_RECIPIENTS) {
    return NextResponse.json(
      { error: `Broadcast exceeds the ${MAX_USER_RECIPIENTS}-recipient limit (${count} matched)` },
      { status: 400 },
    )
  }

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count })
  }

  const limiter = type === "intern_broadcast" ? internRatelimit : userRatelimit
  const rateLimitKey = type === "intern_broadcast" ? `admin-intern-broadcast:${admin.email}` : "admin:broadcast"
  const { success } = await limiter.limit(rateLimitKey)
  if (!success) {
    return NextResponse.json(
      {
        error:
          type === "intern_broadcast"
            ? "Only 5 intern broadcasts are allowed per hour. Try again later."
            : "Only one broadcast is allowed per hour. Try again later.",
      },
      { status: 429 },
    )
  }

  const created = await db.scheduledEmail.create({
    data: { type, subject, body, recipientType, recipientIds, scheduledFor, createdBy: admin.email },
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "SCHEDULE_EMAIL",
    details: `"${subject}" (${type}) scheduled for ${scheduledFor.toISOString()} → ${count} recipient${count === 1 ? "" : "s"}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, scheduledEmail: created })
}
