// /api/admin/users/[userId]/email — personal emails to one person, written
// with the AI email writer from their admin profile.
//   GET                → the personal emails sent to them (newest first)
//   POST { design }    → sends this AI-written email to them now, personalized
//                        for them; its art must be painted and ours
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
  return NextResponse.json({
    emails: rows.map((r) => {
      const sent = (r.newValue ?? {}) as { subject?: string; picture?: string }
      return { id: r.id, sentAt: r.createdAt, by: r.adminEmail, subject: sent.subject ?? "", picture: sent.picture ?? null }
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
  const problem = artProblem(design, { painted: true })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, deletedAt: true } })
  if (!user || user.deletedAt) return NextResponse.json({ error: "That person's account wasn't found" }, { status: 404 })

  const copy = personalizeDesignedEmail(await renderDesignedEmail(design), design.subject, await resolveVariables(user.id))
  const { error } = await resend.emails.send({ from: FROM, to: user.email, subject: copy.subject, html: copy.html })
  if (error) return NextResponse.json({ error: `Resend: ${error.message}` }, { status: 502 })

  await logAdminAction({
    adminEmail: admin.email,
    action: "SEND_PERSONAL_EMAIL",
    targetUserId: user.id,
    targetEmail: user.email,
    details: `Personal email "${copy.subject}"`,
    newValue: { subject: copy.subject, picture: design.hero.imageUrl ?? null },
    ipAddress: getRequestIp(req) ?? undefined,
  })
  return NextResponse.json({ ok: true, sentTo: user.email })
}
