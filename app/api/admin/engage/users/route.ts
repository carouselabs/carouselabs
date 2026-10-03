// GET /api/admin/engage/users — one page of Engage users, filtered and
// sorted on the server (lib/engage/adminQueries.ts).
//   ?q=          email, name or user id
//   ?access=     all | paid | granted | free | suspended | overrides
//   ?activity=   any | today | 7d | 30d | inactive30 | never
//   ?platform=   any | linkedin | x (the extension they use)
//   ?tag=        an admin tag
//   ?sort=       last_active | newest | oldest | email | usage_month
//   ?page= &pageSize= (max 100)
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import {
  listEngageUsers,
  USER_ACCESS_FILTERS,
  USER_ACTIVITY_FILTERS,
  USER_PLATFORM_FILTERS,
  USER_SORTS,
} from "@/lib/engage/adminQueries"

const query = z.object({
  q: z.string().max(200).optional(),
  access: z.enum(USER_ACCESS_FILTERS).default("all"),
  activity: z.enum(USER_ACTIVITY_FILTERS).default("any"),
  platform: z.enum(USER_PLATFORM_FILTERS).default("any"),
  tag: z.string().max(40).optional(),
  sort: z.enum(USER_SORTS).default("last_active"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response

  const params = Object.fromEntries(new URL(req.url).searchParams)
  const parsed = query.safeParse(params)
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 })

  const result = await listEngageUsers({ ...parsed.data, tag: parsed.data.tag || undefined })
  return NextResponse.json(result)
}
