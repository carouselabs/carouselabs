// POST /api/admin/campaigns/[id]/recipients — adds more people to a campaign
// (lib/campaigns.ts addCampaignRecipients); anyone already on it is skipped.
//   body: { recipients: <segment>|<lead audience>|string[], recipientValue?, dryRun? }
//   → { added, already }   (dryRun: how many would be added; nothing changes)
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { CampaignError, addCampaignRecipients } from "@/lib/campaigns"
import type { BroadcastRecipients } from "@/lib/broadcast"
import { SEGMENT_TYPES } from "@/lib/segments"
import { LEAD_AUDIENCE_RE } from "@/lib/leadRules"
import { leadsProblem } from "@/lib/leads"

const segmentValues = SEGMENT_TYPES.map((s) => s.value) as [string, ...string[]]

const body = z.object({
  // A segment, a lead audience (lib/leadRules.ts) or a list of addresses.
  recipients: z.union([
    z.enum(segmentValues),
    z.string().regex(LEAD_AUDIENCE_RE),
    z.array(z.string().max(320)).min(1, "Add at least one email").max(10_000),
  ]),
  recipientValue: z.string().trim().max(20).nullish(),
  dryRun: z.boolean().optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Say who to add" }, { status: 400 })
  }
  try {
    const result = await addCampaignRecipients({
      campaignId: (await params).id,
      adminEmail: admin.email,
      recipients: parsed.data.recipients as BroadcastRecipients,
      audienceValue: parsed.data.recipientValue || null,
      dryRun: parsed.data.dryRun,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const problem = err instanceof CampaignError ? err : leadsProblem(err)
    if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
    throw err
  }
}
