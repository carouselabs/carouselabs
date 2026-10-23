// GET /api/admin/engage/errors?range= (&from=&to=) &platform=all|linkedin|x
// What's failing (lib/engage/errorQueries.ts): errors the extensions report
// and AI calls that failed, grouped, with the latest ones.
import { NextResponse } from "next/server"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { engageErrors } from "@/lib/engage/errorQueries"
import { resolveRange } from "@/lib/engage/ranges"
import { parseOverviewPlatform } from "@/lib/engage/adminQueries"

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  const url = new URL(req.url)
  const range = resolveRange(url.searchParams.get("range"), url.searchParams.get("from"), url.searchParams.get("to"))
  if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  const platform = parseOverviewPlatform(url.searchParams.get("platform"))
  if (!platform) return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  return NextResponse.json({ ...(await engageErrors(range.from, range.to, platform)), rangeKey: range.key })
}
