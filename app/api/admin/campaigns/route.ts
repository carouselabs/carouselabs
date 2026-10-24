// /api/admin/campaigns — email campaigns sent in batches the admin picks.
//   GET                → every campaign with its progress (newest first)
//   POST { subject, body, recipients: <segment>|<lead audience>|string[], recipientValue?, dryRun? }
//        or { design, recipients, … } for an AI-written email (its art must be painted)
//        or { readyEmail: <id>, recipients, … } for a ready-made one (lib/readyEmails.ts)
//        sending?: { via, fromEmail, replyTo } what sends it and who it's from (lib/sendingRules.ts)
//        dryRun: true  → how many people it would have, nothing is created
//        otherwise     → creates the campaign and its list; nothing is sent
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { CampaignError, checkSending, countCampaignAudience, createCampaign, listCampaigns } from "@/lib/campaigns"
import { sendingChoiceSchema } from "@/lib/sendingRules"
import type { BroadcastRecipients } from "@/lib/broadcast"
import { designPlainText, emailDesignSchema } from "@/lib/emailDesign"
import { artProblem } from "@/lib/emailArtCheck"
import { SEGMENT_TYPES } from "@/lib/segments"
import { LEAD_AUDIENCE_RE } from "@/lib/leadRules"
import { leadsProblem } from "@/lib/leads"
import { readyEmailById, readyEmailText, readySnapshot } from "@/lib/readyEmails"

const segmentValues = SEGMENT_TYPES.map((s) => s.value) as [string, ...string[]]

const createBody = z.object({
  subject: z.string().trim().min(1, "Write a subject").max(300).optional(),
  body: z.string().trim().min(1, "Write the email").max(50_000).optional(),
  design: emailDesignSchema.optional(),
  readyEmail: z.string().trim().min(1).max(64).optional(),
  // A segment, a lead audience (lib/leadRules.ts) or a list of addresses.
  recipients: z.union([
    z.enum(segmentValues),
    z.string().regex(LEAD_AUDIENCE_RE),
    z.array(z.string().max(320)).min(1, "Add at least one email").max(10_000),
  ]),
  recipientValue: z.string().trim().max(20).nullish(),
  sending: sendingChoiceSchema.optional(),
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
  const { design, dryRun } = parsed.data
  const ready = parsed.data.readyEmail ? readyEmailById(parsed.data.readyEmail) : null
  if (parsed.data.readyEmail && !ready) return NextResponse.json({ error: "That ready-made email isn't there any more" }, { status: 400 })
  if (ready && design) return NextResponse.json({ error: "Pick one email" }, { status: 400 })
  if (design) {
    const problem = artProblem(design, { painted: true })
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  } else if (!ready && (!parsed.data.subject || !parsed.data.body)) {
    return NextResponse.json({ error: "Write a subject and the email" }, { status: 400 })
  }
  const subject = ready ? ready.subject : design ? design.subject : parsed.data.subject!
  const body = ready ? readyEmailText(ready) : design ? designPlainText(design) : parsed.data.body!
  // Checked above against lib/segments.ts and lib/leadRules.ts, or a list of addresses.
  const recipients = parsed.data.recipients as BroadcastRecipients
  const audienceValue = parsed.data.recipientValue || null

  try {
    // Checked when counting too, so a sender that won't work is said before anything is made.
    const sending = parsed.data.sending ? await checkSending(parsed.data.sending, recipients as string) : undefined
    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, count: await countCampaignAudience(recipients, audienceValue) })
    }
    const campaign = await createCampaign({ adminEmail: admin.email, subject, body, recipients, audienceValue, design: ready ? readySnapshot(ready) : design, sending })
    return NextResponse.json({ ok: true, ...campaign }, { status: 201 })
  } catch (err) {
    const problem = err instanceof CampaignError ? err : leadsProblem(err)
    if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
    throw err
  }
}
