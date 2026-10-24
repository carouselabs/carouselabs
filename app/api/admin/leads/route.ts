// /api/admin/leads — leads, uploaded from CSV files or added by hand (lib/leads.ts).
//   GET ?filter=<JSON, lib/leadFilters.ts>&page=<n>
//        → { totals, lists, columns, page, pageSize, total, leads }
//   GET ?only=lists                    → { totals, lists, columns } (for the audience pickers)
//   GET ?only=leads&filter=…&page=…    → { page, pageSize, total, leads } (the table, without
//        counting every list again)
//   POST { listId?, listName, fileName?, columns: [{ key, label }], leads: [...] }
//        one part of an upload or of leads added by hand (LEAD_IMPORT_CHUNK
//        rows); the first part creates the list unless listId names one, the
//        rest pass the listId it answered with
//        → { listId, added, alreadySaved, alreadyUsers, unsubscribed, invalid }
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { FIELD_KEY_RE, LEAD_IMPORT_CHUNK } from "@/lib/leadRules"
import { importLeads, leadsOverview, leadsProblem, listLeads } from "@/lib/leads"
import { leadFilterSchema } from "@/lib/leadFilters"

const nullableText = (max: number) => z.string().trim().max(max).nullable()

const importBody = z.object({
  listId: z.string().min(1).max(64).optional(),
  listName: z.string().trim().min(1, "Name the list").max(120),
  fileName: z.string().trim().max(200).nullish(),
  columns: z.array(z.object({ key: z.string().regex(FIELD_KEY_RE), label: z.string().trim().max(200) })).max(60),
  leads: z
    .array(
      z.object({
        email: z.string().trim().max(320),
        firstName: nullableText(100),
        lastName: nullableText(100),
        name: nullableText(100),
        fields: z.record(z.string().regex(FIELD_KEY_RE), z.string().max(500)),
      }),
    )
    .min(1, "The file has no one in it")
    .max(LEAD_IMPORT_CHUNK),
})

function problemResponse(err: unknown) {
  const problem = leadsProblem(err)
  if (problem) return NextResponse.json({ error: problem.message }, { status: problem.status })
  throw err
}

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const params = new URL(req.url).searchParams
  try {
    const only = params.get("only")
    if (only === "lists") return NextResponse.json(await leadsOverview())
    let raw: unknown = {}
    try {
      raw = JSON.parse(params.get("filter") || "{}")
    } catch {
      return NextResponse.json({ error: "Couldn't read the filters" }, { status: 400 })
    }
    const filter = leadFilterSchema.safeParse(raw)
    if (!filter.success) return NextResponse.json({ error: "Couldn't read the filters" }, { status: 400 })
    const page = await listLeads({ filter: filter.data, page: Number(params.get("page")) || 1 })
    if (only === "leads") return NextResponse.json(page)
    return NextResponse.json({ ...(await leadsOverview()), ...page })
  } catch (err) {
    return problemResponse(err)
  }
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = importBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Couldn't read these leads" }, { status: 400 })
  }
  try {
    return NextResponse.json(await importLeads({ adminEmail: admin.email, ...parsed.data }))
  } catch (err) {
    return problemResponse(err)
  }
}
