// /api/admin/brevo — whether Brevo is ready to send leads' emails (lib/brevo.ts),
// for the Leads page; ?account=anant for Anant Goyal's Brevo (lib/leadAccounts.ts).
//   GET  → { status: BrevoStatus, from, today: { limit, sentToday, left } }
//   POST → turns on the webhook that tells us who Brevo stopped
//          (unsubscribed, bounced, spam), then answers like GET
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { brevoStatus, connectBrevoWebhook } from "@/lib/brevo"
import { campaignAllowance } from "@/lib/campaigns"
import { ACCOUNTS, leadAccountOf, type LeadAccount } from "@/lib/leadAccounts"

// What the account's leads' emails come from: its own sender.
async function answer(account: LeadAccount) {
  const from = ACCOUNTS[account].sender.email
  const [status, today] = await Promise.all([brevoStatus(from, fetch, account), campaignAllowance({ via: "brevo", account })])
  return NextResponse.json({ status, from, today })
}

const accountOf = (req: Request) => leadAccountOf(new URL(req.url).searchParams.get("account"))

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return answer(accountOf(req))
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const account = accountOf(req)
  try {
    await connectBrevoWebhook(fetch, account)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't connect Brevo" }, { status: 502 })
  }
  return answer(account)
}
