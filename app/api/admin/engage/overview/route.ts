// GET /api/admin/engage/overview?range= — the Engage overview: who uses it,
// what they generate, day by day (lib/engage/adminQueries.ts). Every figure
// comes from recorded data; anything not recorded yet comes back null.
//   range: today | yesterday | 7d | 30d | 90d | this_month | last_month | custom
//   custom: &from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, at most 366 days)
//   platform: all (default) | linkedin | x — one extension's figures
import { NextResponse } from "next/server"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { engageOverview, type OverviewPlatform } from "@/lib/engage/adminQueries"
import { resolveRange } from "@/lib/engage/ranges"

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const range = resolveRange(url.searchParams.get("range"), url.searchParams.get("from"), url.searchParams.get("to"))
  if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 })

  const p = url.searchParams.get("platform") ?? "all"
  if (p !== "all" && p !== "linkedin" && p !== "x") return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  const platform: OverviewPlatform = p

  return NextResponse.json({ ...(await engageOverview(range.from, range.to, new Date(), platform)), rangeKey: range.key })
}
