// GET /api/admin/engage/errors?range= (&from=&to=) &platform=all|linkedin|x
// What's failing (lib/engage/errorQueries.ts): errors the extensions report
// and AI calls that failed, grouped, with the latest ones.
import { NextResponse } from "next/server"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { engageErrors } from "@/lib/engage/errorQueries"
import { resolveRange } from "@/lib/engage/ranges"
import type { OverviewPlatform } from "@/lib/engage/adminQueries"

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  const url = new URL(req.url)
  const range = resolveRange(url.searchParams.get("range"), url.searchParams.get("from"), url.searchParams.get("to"))
  if (!range) return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
  const p = url.searchParams.get("platform") ?? "all"
  if (p !== "all" && p !== "linkedin" && p !== "x") return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
  const platform: OverviewPlatform = p
  return NextResponse.json({ ...(await engageErrors(range.from, range.to, platform)), rangeKey: range.key })
}
