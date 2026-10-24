// /api/admin/campaigns/[id] — one campaign.
//   GET                          → the email, everyone on its list with their
//                                  status, progress, and today's allowance
//   PATCH { status: "archived" | "active" } → archive it or bring it back
//   PATCH { sending: { via, fromEmail, replyTo } } → what sends the rest of it
//         and who it's from (lib/sendingRules.ts)
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { CampaignError, getCampaign, setCampaignSending, setCampaignStatus } from "@/lib/campaigns"
import { sendingChoiceSchema } from "@/lib/sendingRules"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const campaign = await getCampaign(id)
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  return NextResponse.json({ campaign })
}

const patchBody = z.union([z.object({ status: z.enum(["active", "archived"]) }), z.object({ sending: sendingChoiceSchema })])

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { id } = await params
  const parsed = patchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Expected { status } or { sending }" }, { status: 400 })
  try {
    if ("sending" in parsed.data) await setCampaignSending(id, parsed.data.sending, admin.email)
    else await setCampaignStatus(id, parsed.data.status, admin.email)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
