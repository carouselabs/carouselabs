// /api/admin/leads/[id] — one lead (lib/leads.ts).
//   GET   → { lead, lists, emails, columns }: their details, lists, and every
//           campaign email they were sent with when it was seen and clicked
//   PATCH { firstName, lastName, name, fields } → changes them (an empty
//           value removes that column)
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { leadDetail, leadsProblem, updateLead } from "@/lib/leads"
import { FIELD_KEY_RE } from "@/lib/leadRules"

function problemResponse(err: unknown) {
  const problem = leadsProblem(err)
  if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
  throw err
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  try {
    return NextResponse.json(await leadDetail((await params).id))
  } catch (err) {
    return problemResponse(err)
  }
}

const text = (max: number) => z.string().max(max).nullable()
const patchBody = z.object({
  firstName: text(100),
  lastName: text(100),
  name: text(100),
  fields: z.record(z.string().regex(FIELD_KEY_RE), z.string().max(500)),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = patchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Couldn't read the changes" }, { status: 400 })
  try {
    await updateLead((await params).id, { admin: admin.email, ...parsed.data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return problemResponse(err)
  }
}
