// POST /api/admin/engage/users/[userId]/grants — give this user free
// (unlimited) Engage access for a while, or for life.
// body: { duration, endsAt?, reason, sendInvite? }
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { createGrant } from "@/lib/engage/grantActions"
import { grantLengthSchema, grantPlatformSchema } from "@/lib/engage/grants"
import { getRequestIp } from "@/lib/auditLog"

const body = z.intersection(
  grantLengthSchema,
  z.object({
    reason: z.string().trim().min(3, "Say why").max(500),
    sendInvite: z.boolean().default(false),
    platform: grantPlatformSchema,
  }),
)

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.access.manage")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, body)
  if (!parsed.ok) return parsed.response

  try {
    const result = await createGrant({
      admin: gate.admin,
      email: user.email,
      duration: parsed.data.duration,
      customEndsAt: parsed.data.endsAt,
      reason: parsed.data.reason,
      sendInvite: parsed.data.sendInvite,
      platform: parsed.data.platform,
      ip: getRequestIp(req),
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't grant access" }, { status: 400 })
  }
}
