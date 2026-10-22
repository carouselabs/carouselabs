// GET /api/admin/sent-emails — the Sent emails library (lib/sentEmails.ts):
// templates, campaigns and personal emails, newest first, each with whether
// it was seen and clicked.
//   → { templates: [...], campaigns: [...], personal: [...] }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { listSentEmails } from "@/lib/sentEmails"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return NextResponse.json(await listSentEmails())
}
