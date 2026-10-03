// POST /api/admin/engage/users/bulk — one action on up to 100 selected users,
// each done exactly as on the user page and audited per user (marked
// "bulk"). Users the action doesn't apply to are skipped with the reason.
// body: { action, userIds, reason?, duration?, customEndsAt?, tag? }
//   grant    free access for `duration` (needs reason)
//   suspend  pause Engage access (needs reason)
//   resume   resume it (needs reason)
//   tag      add `tag`
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireEngagePermission, type EngagePermission } from "@/lib/engage/adminAccess"
import { parseBody } from "@/lib/engage/adminApi"
import { createGrant } from "@/lib/engage/grantActions"
import { GRANT_DURATIONS } from "@/lib/engage/grants"
import { addUserTag, setEngageSuspended, type ActionResult } from "@/lib/engage/userActions"
import { getRequestIp } from "@/lib/auditLog"

// The most users one bulk action takes.
const BULK_MAX = 100

const reason = z.string().trim().min(3, "Say why").max(500)
const userIds = z.array(z.string().min(1).max(64)).min(1, "Select at least one user").max(BULK_MAX, `At most ${BULK_MAX} users at a time`)
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), userIds, reason, duration: z.enum(GRANT_DURATIONS), customEndsAt: z.string().optional() }),
  z.object({ action: z.literal("suspend"), userIds, reason }),
  z.object({ action: z.literal("resume"), userIds, reason }),
  z.object({
    action: z.literal("tag"),
    userIds,
    tag: z.string().trim().min(1, "Name the tag").max(32).regex(/^[\p{L}\p{N} _-]+$/u, "Letters, numbers, spaces, - and _ only"),
  }),
])

const PERMISSION: Record<z.infer<typeof body>["action"], EngagePermission> = {
  grant: "engage.access.manage",
  suspend: "engage.users.suspend",
  resume: "engage.users.suspend",
  tag: "engage.users.notes",
}

export async function POST(req: Request) {
  const parsed = await parseBody(req, body)
  if (!parsed.ok) {
    // Still check who is asking first: a non-admin learns nothing from a 400.
    const gate = await requireEngagePermission(req, "engage.view")
    return gate.ok ? parsed.response : gate.response
  }
  const input = parsed.data
  const gate = await requireEngagePermission(req, PERMISSION[input.action])
  if (!gate.ok) return gate.response

  const ip = getRequestIp(req)
  const ids = [...new Set(input.userIds)]
  const users = await db.user.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, email: true } })
  const byId = new Map(users.map((u) => [u.id, u]))

  const done: string[] = []
  const skipped: { userId: string; why: string }[] = []
  for (const id of ids) {
    const user = byId.get(id)
    if (!user) {
      skipped.push({ userId: id, why: "User not found" })
      continue
    }
    let result: ActionResult
    try {
      if (input.action === "grant") {
        await createGrant({
          admin: gate.admin,
          email: user.email,
          duration: input.duration,
          customEndsAt: input.customEndsAt,
          reason: `${input.reason} (bulk)`,
          sendInvite: false,
          ip,
        })
        result = { ok: true }
      } else if (input.action === "tag") {
        result = await addUserTag({ admin: gate.admin, user, tag: input.tag, ip, bulk: true })
      } else {
        result = await setEngageSuspended({ admin: gate.admin, user, suspend: input.action === "suspend", reason: input.reason, ip, bulk: true })
      }
    } catch (err) {
      result = { ok: false, why: err instanceof Error ? err.message : "Failed" }
    }
    if (result.ok) done.push(id)
    else skipped.push({ userId: id, why: result.why })
  }
  return NextResponse.json({ done: done.length, skipped })
}
