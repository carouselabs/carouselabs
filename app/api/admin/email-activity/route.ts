// GET /api/admin/email-activity?kind=campaign|personal&id=… — everything that
// happened with one sent email (lib/emailReportRules.ts activityOf): when it
// went, each time the person saw it and clicked (with the link and app), and
// what security scanners and Apple Mail did.
//   → { sentAt, items: [{ at, what, link, app, reason, count }] }
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { activityOf } from "@/lib/emailReportRules"

const query = z.object({ kind: z.enum(["campaign", "personal"]), id: z.string().min(1).max(64) })

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Which email?" }, { status: 400 })
  const { kind, id } = parsed.data

  const sentAt =
    kind === "campaign"
      ? (await db.emailCampaignRecipient.findUnique({ where: { id }, select: { sentAt: true } }))?.sentAt
      : (await db.personalEmailTrack.findUnique({ where: { emailId: id }, select: { createdAt: true } }))?.createdAt
  if (sentAt === undefined) return NextResponse.json({ error: "That email isn't there" }, { status: 404 })

  let events: Parameters<typeof activityOf>[0] = []
  try {
    events = await db.emailTrackEvent.findMany({
      where: { kind, refId: id },
      orderBy: { at: "asc" },
      take: 500,
      select: { kind: true, refId: true, type: true, at: true, link: true, userAgent: true, verdict: true, reason: true },
    })
  } catch (err) {
    // No activity log yet (scripts/email-scanners.sql): nothing to show.
    if (!isEngageSchemaMissing(err)) throw err
  }
  return NextResponse.json({ sentAt, items: activityOf(events) })
}
