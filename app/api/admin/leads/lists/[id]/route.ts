// /api/admin/leads/lists/[id] — one list (lib/leads.ts).
//   PATCH { name?, filter? }  renames it, or changes a smart list's filter
//   DELETE ?leads=keep|delete  deletes it; a static list's leads stay unless
//          leads=delete (then the ones only on it go, except anyone who
//          unsubscribed). A smart list has no leads of its own.
//          → { removed }
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { deleteLeadList, leadsProblem, updateLeadList } from "@/lib/leads"
import { leadFilterSchema } from "@/lib/leadFilters"

function problemResponse(err: unknown) {
  const problem = leadsProblem(err)
  if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
  throw err
}

const patchBody = z.object({ name: z.string().trim().max(120).optional(), filter: leadFilterSchema.optional() })

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = patchBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Expected { name } or { filter }" }, { status: 400 })
  try {
    await updateLeadList((await params).id, { admin: admin.email, ...parsed.data })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return problemResponse(err)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const withLeads = new URL(req.url).searchParams.get("leads") !== "keep"
  try {
    return NextResponse.json(await deleteLeadList((await params).id, admin.email, { withLeads }))
  } catch (err) {
    return problemResponse(err)
  }
}
