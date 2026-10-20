// POST /api/admin/campaigns/[id]/send { recipientIds } — sends the campaign's
// email to the ticked people who haven't had it yet (lib/campaigns.ts).
// Answers { sent, failed, skipped, error?, left }: skipped = already sent or
// being sent by another click; left = how many more can go today.
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { getRequestIp } from "@/lib/auditLog"
import { CampaignError, sendCampaignBatch } from "@/lib/campaigns"
import { CAMPAIGN_DAILY_LIMIT } from "@/lib/campaignRules"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

// A batch is at most a day's allowance: one Resend batch request.
export const maxDuration = 60

const sendBody = z.object({
  recipientIds: z.array(z.string().min(1).max(64)).min(1, "Pick at least one person").max(CAMPAIGN_DAILY_LIMIT, `Send at most ${CAMPAIGN_DAILY_LIMIT} at a time`),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const parsed = sendBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Expected { recipientIds }" }, { status: 400 })
  }
  try {
    const result = await sendCampaignBatch({
      campaignId: id,
      recipientIds: parsed.data.recipientIds,
      adminEmail: admin.email,
      resend,
      from: FROM,
      ipAddress: getRequestIp(req),
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
