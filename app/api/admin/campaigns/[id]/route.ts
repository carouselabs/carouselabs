// /api/admin/campaigns/[id] — one campaign.
//   GET                          → the email, everyone on its list with their
//                                  status, progress, and today's allowance
//   PATCH { status: "archived" | "active" } → archive it or bring it back
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { CampaignError, getCampaign, setCampaignStatus } from "@/lib/campaigns"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const campaign = await getCampaign(id)
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  return NextResponse.json({ campaign })
}

const patchBody = z.object({ status: z.enum(["active", "archived"]) })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const parsed = patchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Expected { status: \"active\" | \"archived\" }" }, { status: 400 })
  try {
    await setCampaignStatus(id, parsed.data.status, admin.email)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
