// app/api/webhooks/resend/route.ts
// Receives Resend's email lifecycle webhooks (email.opened, email.clicked,
// email.bounced, etc. — confirmed against the installed `resend` package's
// own type definitions: WebhookEvent/WebhookEventPayload in
// node_modules/resend/dist/index.d.mts, not assumed from memory) and logs
// the ones we track as EmailEngagement rows for sequence steps.
//
// Correlation: Resend identifies the email only by its own message id
// (data.email_id) — never by our sequenceId/stepId/userId. The cron that
// sends each step (app/api/cron/process-email-sequences) stores that id on
// the "sent" EmailEngagement row it writes (resendEmailId); this handler
// looks that row up to learn which sequence/step/user an opened/clicked/
// bounced event belongs to.
//
// Engagement stats are best-effort analytics, not financial data — unlike
// the Clerk/Lemon Squeezy webhooks, this doesn't maintain a dedicated
// ProcessedWebhookEvent idempotency row for a redelivered event. A
// duplicate delivery would double-count a raw event total, but open/click
// RATE (computed as "sent rows with >=1 matching engagement row", see
// app/api/admin/sequences/[id]/engagement) is naturally unaffected by it.
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { db } from "@/lib/db"

export const runtime = "nodejs"

const resend = new Resend(process.env.RESEND_API_KEY)

const TRACKED_EVENTS: Record<string, "opened" | "clicked" | "bounced"> = {
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return new Response("Missing RESEND_WEBHOOK_SECRET", { status: 500 })
  }

  const rawBody = await req.text()

  // Resend's SDK verify() wants the three raw Svix header VALUES as a plain
  // object — not the Fetch API Headers instance (its own `Headers` type
  // here is a same-named-but-different shape: { id, timestamp, signature }).
  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  let event: { type: string; data: { email_id: string } }
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret: secret,
    }) as { type: string; data: { email_id: string } }
  } catch {
    return new Response("Invalid signature", { status: 401 })
  }

  const mapped = TRACKED_EVENTS[event.type]
  if (!mapped) {
    // sent/delivered/complained/delivery_delayed/etc. — the cron already
    // writes the "sent" row itself at send time; nothing else to track here.
    return NextResponse.json({ ok: true })
  }

  const sentRow = await db.emailEngagement.findFirst({
    where: { resendEmailId: event.data.email_id, event: "sent" },
    select: { sequenceId: true, stepId: true, userId: true },
  })
  if (!sentRow) {
    // Not a sequence-step send we're tracking (a one-off Broadcast send, for
    // instance — those don't set resendEmailId today) — ack, not an error.
    return NextResponse.json({ ok: true })
  }

  await db.emailEngagement.create({
    data: {
      sequenceId: sentRow.sequenceId,
      stepId: sentRow.stepId,
      userId: sentRow.userId,
      event: mapped,
    },
  })

  return NextResponse.json({ ok: true })
}
