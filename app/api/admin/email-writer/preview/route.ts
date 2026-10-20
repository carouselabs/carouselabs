// POST /api/admin/email-writer/preview { design } → { html } — the email as
// it will look, for the writer's preview (pictures not painted yet show as
// placeholders). Nothing is sent.
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { emailDesignSchema } from "@/lib/emailDesign"
import { artProblem } from "@/lib/emailArtCheck"
import { renderDesignedEmail } from "@/lib/emailDesignRender"

const body = z.object({ design: emailDesignSchema })

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  const problem = artProblem(parsed.data.design, { painted: false })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  return NextResponse.json({ html: await renderDesignedEmail(parsed.data.design, { preview: true }) })
}
