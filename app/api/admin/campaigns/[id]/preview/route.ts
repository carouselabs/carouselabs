// GET /api/admin/campaigns/[id]/preview → { html } — the campaign's email as
// people get it (an AI-written design, or a hand-written one in the
// broadcast layout), with {{variables}} still in it.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { emailDesignSchema } from "@/lib/emailDesign"
import { renderDesignedEmail } from "@/lib/emailDesignRender"
import { renderBroadcastEmailHtml } from "@/lib/broadcastRender"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const campaign = await db.emailCampaign.findUnique({ where: { id }, select: { subject: true, body: true, design: true } })
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  const design = campaign.design ? emailDesignSchema.safeParse(campaign.design) : null
  if (design && !design.success) return NextResponse.json({ error: "This campaign's email can't be read" }, { status: 400 })
  const html = design?.success
    ? await renderDesignedEmail(design.data)
    : `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${renderBroadcastEmailHtml(campaign.subject, campaign.body)}</body></html>`
  return NextResponse.json({ html })
}
