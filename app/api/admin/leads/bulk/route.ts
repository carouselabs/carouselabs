// POST /api/admin/leads/bulk — one thing to many leads (lib/leads.ts bulkLeads):
//   { action: "add" | "remove" | "delete", ids?: string[] | filter?: <lib/leadFilters.ts>,
//     listId?, newListName? }
//   add: onto a static list, or a new one named newListName; remove: off a
//   static list; delete: the leads (anyone who stopped is kept).
//   → { affected, kept, listId? }
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { bulkLeads, leadsProblem } from "@/lib/leads"
import { leadFilterSchema } from "@/lib/leadFilters"

const body = z
  .object({
    action: z.enum(["add", "remove", "delete"]),
    ids: z.array(z.string().min(1).max(64)).min(1).max(50_000).optional(),
    filter: leadFilterSchema.optional(),
    listId: z.string().min(1).max(64).optional(),
    newListName: z.string().trim().max(120).optional(),
  })
  .refine((b) => b.ids || b.filter, { message: "Pick the leads" })

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Pick the leads" }, { status: 400 })
  try {
    return NextResponse.json(await bulkLeads({ admin: admin.email, ...parsed.data }))
  } catch (err) {
    const problem = leadsProblem(err)
    if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
    throw err
  }
}
