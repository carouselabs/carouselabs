// PATCH /api/admin/engage/grants/[grantId] — revoke a grant at once, or
// extend it.
//   { action: "revoke", reason }
//   { action: "extend", duration, endsAt?, reason }
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { parseBody } from "@/lib/engage/adminApi"
import { extendGrant, revokeGrant } from "@/lib/engage/grantActions"
import { GRANT_DURATIONS } from "@/lib/engage/grants"
import { getRequestIp } from "@/lib/auditLog"

const reason = z.string().trim().min(3, "Say why").max(500)
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke"), reason }),
  z.object({
    action: z.literal("extend"),
    duration: z.enum(GRANT_DURATIONS),
    endsAt: z.iso.datetime().optional(),
    reason,
  }),
])

export async function PATCH(req: Request, { params }: { params: Promise<{ grantId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response
  const { grantId } = await params

  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response
  const ip = getRequestIp(req)

  if (parsed.data.action === "extend" && parsed.data.duration === "custom" && !parsed.data.endsAt) {
    return NextResponse.json({ error: "Pick an end date" }, { status: 400 })
  }

  const result =
    parsed.data.action === "revoke"
      ? await revokeGrant({ admin: gate.admin, grantId, reason: parsed.data.reason, ip })
      : await extendGrant({
          admin: gate.admin,
          grantId,
          duration: parsed.data.duration,
          customEndsAt: parsed.data.endsAt,
          reason: parsed.data.reason,
          ip,
        })

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Grant not found" ? 404 : 400 })
  }
  return NextResponse.json(result)
}
