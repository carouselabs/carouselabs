// GET /api/admin/engage/health — is Engage working right now
// (lib/engage/health.ts). Checked fresh on every request.
import { NextResponse } from "next/server"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { engageHealth } from "@/lib/engage/health"

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  return NextResponse.json(await engageHealth(), { headers: { "Cache-Control": "no-store" } })
}
