// GET /api/admin/senders — who a campaign or personal email can come from
// (lib/senders.ts): support@carouselabs.com and every carouselabs.com sender
// added in Brevo.
//   → { senders: [{ name, email, inBrevo }], brevoKnown }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { senderChoices } from "@/lib/senders"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return NextResponse.json(await senderChoices())
}
