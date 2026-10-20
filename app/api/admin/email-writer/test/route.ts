// POST /api/admin/email-writer/test { design } — sends the AI-written email
// to the signed-in admin only, personalized for their own account, so they
// see it in a real inbox before making it a campaign.
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { emailDesignSchema } from "@/lib/emailDesign"
import { artProblem } from "@/lib/emailArtCheck"
import { personalizeDesignedEmail, renderDesignedEmail } from "@/lib/emailDesignRender"
import { resolveVariables } from "@/lib/broadcastVariables"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = "CarouseLabs <support@carouselabs.com>"

const body = z.object({ design: emailDesignSchema })

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  const design = parsed.data.design
  const problem = artProblem(design, { painted: true })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const copy = personalizeDesignedEmail(await renderDesignedEmail(design), design.subject, await resolveVariables(admin.id))
  const { error } = await resend.emails.send({ from: FROM, to: admin.email, subject: `[TEST] ${copy.subject}`, html: copy.html })
  if (error) return NextResponse.json({ error: `Resend: ${error.message}` }, { status: 502 })
  return NextResponse.json({ ok: true, sentTo: admin.email })
}
