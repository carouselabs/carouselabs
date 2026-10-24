// POST /api/admin/leads/lists — a new list (lib/leads.ts createLeadList):
//   { name, kind: "static" }                     an empty list, filled by ticking leads
//   { name, kind: "smart", filter: <lib/leadFilters.ts> }  whoever matches the filter now
//   → { id }
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { createLeadList, leadsProblem } from "@/lib/leads"
import { leadFilterSchema } from "@/lib/leadFilters"

const body = z.object({
  name: z.string().trim().min(1, "Name the list").max(120),
  kind: z.enum(["static", "smart"]),
  filter: leadFilterSchema.optional(),
})

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Name the list" }, { status: 400 })
  try {
    return NextResponse.json(await createLeadList({ admin: admin.email, ...parsed.data }), { status: 201 })
  } catch (err) {
    const problem = leadsProblem(err)
    if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
    throw err
  }
}
