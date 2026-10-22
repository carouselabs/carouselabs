// POST /api/admin/campaigns/[id]/recipients — adds more people to a campaign
// (lib/campaigns.ts addCampaignRecipients); anyone already on it is skipped.
//   body: { recipients: <segment>|string[], recipientValue?, dryRun? }
//   → { added, already }   (dryRun: how many would be added; nothing changes)
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { CampaignError, addCampaignRecipients } from "@/lib/campaigns"
import type { BroadcastRecipients } from "@/lib/broadcast"
import { SEGMENT_TYPES } from "@/lib/segments"

const segmentValues = SEGMENT_TYPES.map((s) => s.value) as [string, ...string[]]

const body = z.object({
  recipients: z.union([z.enum(segmentValues), z.array(z.string().max(320)).min(1, "Add at least one email").max(10_000)]),
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
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
