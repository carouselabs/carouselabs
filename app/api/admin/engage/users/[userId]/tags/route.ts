// /api/admin/engage/users/[userId]/tags — internal labels ("VIP", "Beta
// tester"), filterable on the users table. Never shown to the user.
//   POST   { tag }
//   DELETE ?tag=
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission } from "@/lib/engage/adminAccess"
import { findTargetUser, notFound, parseBody } from "@/lib/engage/adminApi"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

const tagSchema = z
  .string()
  .trim()
  .min(1, "Name the tag")
  .max(32, "Keep tags under 32 characters")
  .regex(/^[\p{L}\p{N} _-]+$/u, "Letters, numbers, spaces, - and _ only")

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.notes")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const user = await findTargetUser(userId)
  if (!user) return notFound()

  const parsed = await parseBody(req, z.object({ tag: tagSchema }))
  if (!parsed.ok) return parsed.response
  const tag = parsed.data.tag

  await db.adminUserTag.upsert({
    where: { userId_tag: { userId, tag } },
    create: { userId, tag, createdBy: gate.admin.email },
    update: {},
  })
  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_ADD_TAG",
    product: "engage",
    targetUserId: userId,
    targetEmail: user.email,
    details: `Tagged "${tag}"`,
    newValue: { tag },
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true, tag }, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const gate = await requireEngagePermission(req, "engage.users.notes")
  if (!gate.ok) return gate.response
  const { userId } = await params
  const tag = new URL(req.url).searchParams.get("tag") ?? ""

  const { count } = await db.adminUserTag.deleteMany({ where: { userId, tag } })
  if (count === 0) return NextResponse.json({ error: "Tag not found" }, { status: 404 })
  await logAdminAction({
    adminEmail: gate.admin.email,
    action: "ENGAGE_REMOVE_TAG",
    product: "engage",
    targetUserId: userId,
    details: `Removed tag "${tag}"`,
    oldValue: { tag },
    ipAddress: getRequestIp(req),
  })
  return NextResponse.json({ ok: true })
}
