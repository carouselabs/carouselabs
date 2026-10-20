// POST /api/admin/campaigns/[id]/test — sends the campaign's email to the
// signed-in admin only, personalized for their own account. Doesn't count
// as a send: nobody on the list is marked.
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { CampaignError, campaignDesign } from "@/lib/campaigns"
import { personalizeDesignedEmail, renderDesignedEmail } from "@/lib/emailDesignRender"
import { applyVariables, renderBroadcastEmailHtml } from "@/lib/broadcastRender"
import { resolveVariables } from "@/lib/broadcastVariables"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const campaign = await db.emailCampaign.findUnique({ where: { id }, select: { subject: true, body: true, design: true } })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })

  try {
    const design = campaignDesign(campaign.design)
    const values = await resolveVariables(admin.id)
    const copy = design
      ? personalizeDesignedEmail(await renderDesignedEmail(design), design.subject, values)
      : {
          subject: applyVariables(campaign.subject, values),
          html: renderBroadcastEmailHtml(applyVariables(campaign.subject, values), applyVariables(campaign.body, values)),
        }
    const { error } = await resend.emails.send({ from: FROM, to: admin.email, subject: `[TEST] ${copy.subject}`, html: copy.html })
    if (error) return NextResponse.json({ error: `Resend: ${error.message}` }, { status: 502 })
    return NextResponse.json({ ok: true, sentTo: admin.email })
  } catch (err) {
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
