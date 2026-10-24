// POST /api/webhooks/brevo?token=… — PUBLIC (see proxy.ts). Brevo calls this
// when it stops someone it sent a lead's email to: they used Brevo's own
// Unsubscribe button, the address bounced or is invalid, they marked it
// spam, or Brevo blocked the send. That lead is never emailed again
// (lib/leads.ts stopLeadByEmail). The token is ours (lib/brevo.ts), set when
// the Leads page connected the webhook, so nobody else can stop anyone.
// Brevo sends one event per call; a list of them is read too.
import { NextResponse } from "next/server"
import { BREVO_STOP_EVENTS, isBrevoWebhookToken } from "@/lib/brevo"
import { stopLeadByEmail } from "@/lib/leads"

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!isBrevoWebhookToken(new URL(req.url).searchParams.get("token") ?? bearer)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 })
  }
  const body: unknown = await req.json().catch(() => null)
  const events = (Array.isArray(body) ? body : [body]).filter((e): e is { event?: unknown; email?: unknown } => !!e && typeof e === "object")
  let stopped = 0
  for (const e of events) {
    const reason = typeof e.event === "string" ? BREVO_STOP_EVENTS[e.event] : undefined
    if (reason && typeof e.email === "string") stopped += await stopLeadByEmail(e.email, reason)
  }
  return NextResponse.json({ ok: true, stopped })
}
