// GET /api/admin/engage/prompts — what each Engage feature sends the AI,
// built from a fixed sample (lib/engage/promptSamples.ts). Read-only.
import { NextResponse } from "next/server"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { promptSamples } from "@/lib/engage/promptSamples"

export async function GET(req: Request) {
  const gate = await requireEngagePermission(req, "engage.view")
  if (!gate.ok) return gate.response
  return NextResponse.json({ prompts: promptSamples() })
}
