// /api/admin/campaigns/[id]/placement — "Where it landed" (lib/placement).
//   GET  → { inbox, setupMissing?, tests, people }: looks in the test inbox for
//          copies due a look first (the page asks again every 20 s while one is waiting)
//   POST → a new test copy through each service the campaign uses (say,
//          after changing the sender), then answers like GET
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { logAdminAction } from "@/lib/auditLog"
import { db } from "@/lib/db"
import { brevoMailer } from "@/lib/brevo"
import { CampaignError, sendPlacementTests } from "@/lib/campaigns"
import { PLACEMENT_SQL_MISSING, placementInbox, placementReport } from "@/lib/placement/tests"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  if (!(await db.emailCampaign.count({ where: { id } }))) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  return NextResponse.json(await placementReport(id))
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  if (!placementInbox()) return NextResponse.json({ error: "There's no test inbox yet: set PLACEMENT_GMAIL_USER and PLACEMENT_GMAIL_APP_PASSWORD." }, { status: 503 })
  try {
    const tests = await sendPlacementTests({ campaignId: id, resend, brevo: brevoMailer(), from: FROM })
    const failed = tests.find((t) => t?.status === "failed")
    await logAdminAction({ adminEmail: admin.email, action: "SEND_PLACEMENT_TEST", details: `campaign ${id}: ${tests.length} test ${tests.length === 1 ? "copy" : "copies"}${failed ? `, failed: ${failed.error}` : " sent"}` })
    if (failed) return NextResponse.json({ error: failed.error ?? "The test copy wasn't sent" }, { status: 502 })
    return NextResponse.json(await placementReport(id))
  } catch (err) {
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    if (isEngageSchemaMissing(err)) return NextResponse.json({ error: PLACEMENT_SQL_MISSING }, { status: 503 })
    throw err
  }
}
