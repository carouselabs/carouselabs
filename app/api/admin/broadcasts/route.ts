// POST /api/admin/broadcasts — send an email to all/pro/free users or a
// custom list. body: { subject, body, recipients, test?, dryRun? }
//   dryRun: true  → resolve + count recipients only, nothing is sent/logged
//   test:   true  → send ONLY to the admin's own email, bypasses the rate
//                   limit and isn't written to the audit log (so it never
//                   shows up in "sent broadcast history" or blocks a real send)
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { Resend } from "resend"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { resolveRecipients, renderBroadcastEmailHtml, type BroadcastRecipients } from "@/lib/broadcast"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

// Global limiter (one fixed key) — this gates the whole broadcast feature,
// not a per-admin or per-IP quota.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1, "1 h"),
  analytics: false,
})

const MAX_RECIPIENTS = 5000

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let subject: string
  let body: string
  let recipients: BroadcastRecipients
  let test = false
  let dryRun = false
  try {
    const json = await req.json()
    subject = String(json.subject ?? "").trim()
    body = String(json.body ?? "").trim()
    recipients = json.recipients
    test = json.test === true
    dryRun = json.dryRun === true
    const validRecipients =
      recipients === "all" ||
      recipients === "pro" ||
      recipients === "free" ||
      (Array.isArray(recipients) && recipients.every((e) => typeof e === "string"))
    if (!subject || !body || !validRecipients) throw new Error()
  } catch {
    return NextResponse.json(
      { error: "Expected { subject, body, recipients: all|pro|free|string[] }" },
      { status: 400 },
    )
  }

  if (test) {
    const { error } = await resend.emails.send({
      from: FROM,
      to: admin.email,
      subject: `[TEST] ${subject}`,
      html: renderBroadcastEmailHtml(subject, body),
    })
    if (error) return NextResponse.json({ error: "Resend: " + error.message }, { status: 502 })
    return NextResponse.json({ ok: true, test: true, sentTo: admin.email })
  }

  const emails = await resolveRecipients(recipients)

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: emails.length })
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "No recipients match that selection" }, { status: 400 })
  }
  if (emails.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `Broadcast exceeds the ${MAX_RECIPIENTS}-recipient limit (${emails.length} matched)` },
      { status: 400 },
    )
  }

  const { success } = await ratelimit.limit("admin:broadcast")
  if (!success) {
    return NextResponse.json(
      { error: "Only one broadcast is allowed per hour. Try again later." },
      { status: 429 },
    )
  }

  const html = renderBroadcastEmailHtml(subject, body)
  const results = await Promise.allSettled(
    emails.map((to) => resend.emails.send({ from: FROM, to, subject, html })),
  )
  const sent = results.filter((r) => r.status === "fulfilled" && !r.value.error).length
  const failed = results.length - sent

  await logAdminAction({
    adminEmail: admin.email,
    action: "SEND_BROADCAST",
    details: `"${subject}" → ${typeof recipients === "string" ? recipients : `${emails.length} custom emails`} (${sent} sent, ${failed} failed)`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, sent, failed, total: emails.length })
}
