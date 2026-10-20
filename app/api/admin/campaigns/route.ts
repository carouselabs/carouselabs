// /api/admin/campaigns — email campaigns sent in batches the admin picks.
//   GET                → every campaign with its progress (newest first)
//   POST { subject, body, recipients: <segment>|string[], recipientValue?, dryRun? }
//        dryRun: true  → how many people it would have, nothing is created
//        otherwise     → creates the campaign and its list; nothing is sent
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { CampaignError, countCampaignAudience, createCampaign, listCampaigns } from "@/lib/campaigns"
import type { BroadcastRecipients } from "@/lib/broadcast"
import { SEGMENT_TYPES } from "@/lib/segments"

const segmentValues = SEGMENT_TYPES.map((s) => s.value) as [string, ...string[]]

const createBody = z.object({
  subject: z.string().trim().min(1, "Write a subject").max(300),
  body: z.string().trim().min(1, "Write the email").max(50_000),
  recipients: z.union([z.enum(segmentValues), z.array(z.string().max(320)).min(1, "Add at least one email").max(10_000)]),
  recipientValue: z.string().trim().max(20).nullish(),
  dryRun: z.boolean().optional(),
})

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  return NextResponse.json({ campaigns: await listCampaigns() })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const parsed = createBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid campaign" }, { status: 400 })
  }
  const { subject, body, dryRun } = parsed.data
  // Checked above against lib/segments.ts, or a list of addresses.
  const recipients = parsed.data.recipients as BroadcastRecipients
  const audienceValue = parsed.data.recipientValue || null

  try {
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, count: await countCampaignAudience(recipients, audienceValue) })
    }
    const campaign = await createCampaign({ adminEmail: admin.email, subject, body, recipients, audienceValue })
    return NextResponse.json({ ok: true, ...campaign }, { status: 201 })
  } catch (err) {
    if (err instanceof CampaignError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
