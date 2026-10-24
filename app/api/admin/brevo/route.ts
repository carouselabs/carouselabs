// /api/admin/brevo — whether Brevo is ready to send leads' emails (lib/brevo.ts),
// for the Leads page.
//   GET  → { status: BrevoStatus, from, today: { limit, sentToday, left } }
//   POST → turns on the webhook that tells us who Brevo stopped
//          (unsubscribed, bounced, spam), then answers like GET
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { brevoStatus, connectBrevoWebhook, parseFrom } from "@/lib/brevo"
import { campaignAllowance } from "@/lib/campaigns"

// What leads' emails come from: the same address as every other email.
const FROM = "CarouseLabs <support@carouselabs.com>"

async function answer() {
  const from = parseFrom(FROM).email
  const [status, today] = await Promise.all([brevoStatus(from), campaignAllowance({ via: "brevo" })])
  return NextResponse.json({ status, from, today })
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return answer()
}

export async function POST() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  try {
    await connectBrevoWebhook()
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't connect Brevo" }, { status: 502 })
  }
  return answer()
}
