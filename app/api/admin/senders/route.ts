// GET /api/admin/senders — who a campaign or personal email can come from
// (lib/senders.ts): support@carouselabs.com and every carouselabs.com sender
// added in Brevo.
//   ?account=anant: Anant Goyal's (hello@anantgoyal.in and anantgoyal.in
//   senders in its Brevo, lib/leadAccounts.ts)
//   → { senders: [{ name, email, inBrevo }], brevoKnown }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { senderChoices } from "@/lib/senders"
import { leadAccountOf } from "@/lib/leadAccounts"

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return NextResponse.json(await senderChoices(undefined, leadAccountOf(new URL(req.url).searchParams.get("account"))))
}
