// GET /api/admin/engage/sessions — every browser signed in to an extension
// (lib/engage/sessionQueries.ts).
//   ?status=   active | signed_out | all
//   ?platform= any | linkedin | x
//   ?q=        email
//   ?page= &pageSize= (max 100)
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { listSessions, SESSION_PLATFORMS, SESSION_STATUSES } from "@/lib/engage/sessionQueries"

const query = z.object({
  status: z.enum(SESSION_STATUSES).default("active"),
  platform: z.enum(SESSION_PLATFORMS).default("any"),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 })
  return NextResponse.json(await listSessions(parsed.data))
}
