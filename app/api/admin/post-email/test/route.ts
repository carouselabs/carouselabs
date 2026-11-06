// POST /api/admin/post-email/test { email } → { sentTo, built } — sends the
// shared-post email to the signed-in admin only, personalized for their own
// account, so they see it in a real inbox before making it a campaign.
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { resolveVariables } from "@/lib/broadcastVariables"
import { personalizeDesignedEmail } from "@/lib/emailDesignRender"
import { PostEmailError, finishPostEmail } from "@/lib/postEmailPictures"
import { DEFAULT_SENDER, fromHeader } from "@/lib/sendingRules"

export const maxDuration = 60

const resend = new Resend(process.env.RESEND_API_KEY)
const body = z.object({ email: z.unknown() })

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "This email can't be read" }, { status: 400 })
  try {
    const done = await finishPostEmail(parsed.data.email)
    const copy = personalizeDesignedEmail(done.html, done.email.subject, await resolveVariables(admin.id))
    const { error } = await resend.emails.send({
      from: fromHeader({ name: done.email.fromName, email: DEFAULT_SENDER.email }),
      to: admin.email,
      subject: `[TEST] ${copy.subject}`,
      html: copy.html,
      text: done.text,
    })
    if (error) return NextResponse.json({ error: `Resend: ${error.message}` }, { status: 502 })
    return NextResponse.json({ ok: true, sentTo: admin.email, built: done.email.built })
  } catch (err) {
    if (err instanceof PostEmailError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
