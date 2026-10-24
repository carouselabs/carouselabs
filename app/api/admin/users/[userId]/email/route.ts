// /api/admin/users/[userId]/email — personal emails to one person, written
// with the AI email writer from their admin profile.
//   GET                → the personal emails sent to them (newest first), with
//                        whether each was seen and clicked (lib/emailTracking.ts)
//   POST { design }    → sends this AI-written email to them now, personalized
//                        for them and tracked; its art must be painted and ours
import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { getRequestIp, logAdminAction } from "@/lib/auditLog"
import { emailDesignSchema } from "@/lib/emailDesign"
import { artProblem } from "@/lib/emailArtCheck"
import { personalizeDesignedEmail, renderDesignedEmail } from "@/lib/emailDesignRender"
import { resolveVariables } from "@/lib/broadcastVariables"
import { trackingToken, withTracking } from "@/lib/emailTracking"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { mergeFieldProblem } from "@/lib/leadRules"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { userId } = await params
  const rows = await db.auditLog.findMany({
    where: { action: "SEND_PERSONAL_EMAIL", targetUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, createdAt: true, adminEmail: true, newValue: true },
  })
  const sent = rows.map((r) => ({ row: r, value: (r.newValue ?? {}) as { subject?: string; picture?: string; emailId?: string } }))
  // Emails sent before tracking existed have no emailId: they show as not tracked.
  const emailIds = sent.flatMap((s) => (s.value.emailId ? [s.value.emailId] : []))
  const tracks = emailIds.length
    ? await db.personalEmailTrack.findMany({ where: { emailId: { in: emailIds } } }).catch((err) => {
        if (isEngageSchemaMissing(err)) return []
        throw err
      })
    : []
  const trackById = new Map(tracks.map((t) => [t.emailId, t]))
  return NextResponse.json({
    emails: sent.map(({ row, value }) => {
      const track = value.emailId ? trackById.get(value.emailId) : undefined
      return {
        id: row.id,
        sentAt: row.createdAt,
        by: row.adminEmail,
        subject: value.subject ?? "",
        picture: value.picture ?? null,
        tracked: !!track,
        openedAt: track?.openedAt ?? null,
        openCount: track?.openCount ?? 0,
        clickedAt: track?.clickedAt ?? null,
        clickCount: track?.clickCount ?? 0,
        // Kept in full (lib/sentEmails.ts): it can be used again.
        reuse: track?.design && value.emailId ? `personal:${value.emailId}` : null,
      }
    }),
  })
}

const body = z.object({ design: emailDesignSchema })

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const { userId } = await params
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  const design = parsed.data.design
  // A lead's column ({{company}}) means nothing for a user.
  const problem = artProblem(design, { painted: true }) ?? mergeFieldProblem(JSON.stringify(design), false)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, deletedAt: true } })
  if (!user || user.deletedAt) return NextResponse.json({ error: "That person's account wasn't found" }, { status: 404 })

  const copy = personalizeDesignedEmail(await renderDesignedEmail(design), design.subject, await resolveVariables(user.id))
  // Tracked when its row can be made (lib/emailTracking.ts); otherwise sent untracked.
  const emailId = randomUUID()
  let tracked = false
  try {
    // The email itself is kept too, so it can be used again (lib/sentEmails.ts).
    await db.personalEmailTrack.create({ data: { emailId, userId: user.id, subject: copy.subject, design } })
    tracked = true
  } catch {
    // No tracking table yet (scripts/email-tracking.sql): send it untracked.
  }
  const token = tracked ? trackingToken({ kind: "personal", id: emailId }) : null
  const { error } = await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: copy.subject,
    html: token ? withTracking(copy.html, token) : copy.html,
  })
  if (error) {
    if (tracked) await db.personalEmailTrack.delete({ where: { emailId } }).catch(() => {})
    return NextResponse.json({ error: `Resend: ${error.message}` }, { status: 502 })
  }

  await logAdminAction({
    adminEmail: admin.email,
    action: "SEND_PERSONAL_EMAIL",
    targetUserId: user.id,
    targetEmail: user.email,
    details: `Personal email "${copy.subject}"`,
    newValue: { subject: copy.subject, picture: design.hero.imageUrl ?? null, emailId: token ? emailId : null },
    ipAddress: getRequestIp(req) ?? undefined,
  })
  return NextResponse.json({ ok: true, sentTo: user.email })
}
