// POST /api/admin/broadcasts — send an email to all/pro/growth/free users or
// a custom list. body: { subject, body, recipients, test?, dryRun?, previewFor? }
//   dryRun:     true   → resolve + count recipients only, nothing is sent/logged
//   test:       true   → send ONLY to the admin's own email (personalized against
//                         the admin's own account), bypasses the rate limit and
//                         isn't written to the audit log
//   previewFor: email  → resolve {{variables}} for that specific real user and
//                         return them (no send) — powers the composer's
//                         "Preview As [user]" dropdown. Independent of dryRun/test.
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { Resend } from "resend"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { resolveRecipients, renderBroadcastEmailHtml, type BroadcastRecipients } from "@/lib/broadcast"
import { applyVariables } from "@/lib/broadcastRender"
import { resolveVariables } from "@/lib/broadcastVariables"
import { SEGMENT_TYPES } from "@/lib/segments"

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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SEGMENTS = new Set<string>(SEGMENT_TYPES.map((s) => s.value))

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let subject: string
  let body: string
  let recipients: BroadcastRecipients
  let recipientValue: string | null = null
  let test = false
  let dryRun = false
  let previewFor: string | null = null
  try {
    const json = await req.json()
    subject = String(json.subject ?? "").trim()
    body = String(json.body ?? "").trim()
    recipients = json.recipients
    recipientValue = typeof json.recipientValue === "string" && json.recipientValue.trim() ? json.recipientValue.trim() : null
    test = json.test === true
    dryRun = json.dryRun === true
    previewFor = typeof json.previewFor === "string" && json.previewFor.trim() ? json.previewFor.trim() : null

    // previewFor only needs a valid email — subject/body/recipients aren't
    // required for it (the composer may still be mid-draft when previewing).
    if (previewFor) {
      if (!EMAIL_RE.test(previewFor)) throw new Error()
    } else {
      const validRecipients =
        (typeof recipients === "string" && VALID_SEGMENTS.has(recipients)) ||
        (Array.isArray(recipients) && recipients.every((e) => typeof e === "string"))
      if (!subject || !body || !validRecipients) throw new Error()
    }
  } catch {
    return NextResponse.json(
      { error: "Expected { subject, body, recipients: <segment>|string[] }" },
      { status: 400 },
    )
  }

  if (previewFor) {
    const previewUser = await db.user.findFirst({ where: { email: previewFor } })
    if (!previewUser) return NextResponse.json({ error: "No user with that email" }, { status: 404 })
    const variables = await resolveVariables(previewUser.id)
    return NextResponse.json({ ok: true, variables })
  }

  if (test) {
    const variables = await resolveVariables(admin.id)
    const { error } = await resend.emails.send({
      from: FROM,
      to: admin.email,
      subject: `[TEST] ${applyVariables(subject, variables)}`,
      html: renderBroadcastEmailHtml(applyVariables(subject, variables), applyVariables(body, variables)),
    })
    if (error) return NextResponse.json({ error: "Resend: " + error.message }, { status: 502 })
    return NextResponse.json({ ok: true, test: true, sentTo: admin.email })
  }

  const recipientRows = await resolveRecipients(recipients, recipientValue)

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, count: recipientRows.length })
  }

  if (recipientRows.length === 0) {
    return NextResponse.json({ error: "No recipients match that selection" }, { status: 400 })
  }
  if (recipientRows.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `Broadcast exceeds the ${MAX_RECIPIENTS}-recipient limit (${recipientRows.length} matched)` },
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

  // Personalized per-recipient: a userId-less custom-list address (no
  // matching User row) gets the raw template — applyVariables leaves
  // unresolved {{key}} placeholders as literal text rather than blanking them.
  const results = await Promise.allSettled(
    recipientRows.map(async (r) => {
      const variables = r.userId ? await resolveVariables(r.userId) : null
      const finalSubject = variables ? applyVariables(subject, variables) : subject
      const finalBody = variables ? applyVariables(body, variables) : body
      const { error } = await resend.emails.send({
        from: FROM,
        to: r.email,
        subject: finalSubject,
        html: renderBroadcastEmailHtml(finalSubject, finalBody),
      })
      if (error) throw new Error(error.message)
    }),
  )
  const sent = results.filter((r) => r.status === "fulfilled").length
  const failed = results.length - sent

  await logAdminAction({
    adminEmail: admin.email,
    action: "SEND_BROADCAST",
    details: `"${subject}" → ${typeof recipients === "string" ? recipients : `${recipientRows.length} custom emails`} (${sent} sent, ${failed} failed)`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, sent, failed, total: recipientRows.length })
}
