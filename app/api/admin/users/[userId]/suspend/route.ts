// POST /api/admin/users/[userId]/suspend — set/clear the suspended flag.
// body: { suspend: boolean }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { userId } = await params
  let suspend: boolean
  try {
    const body = await req.json()
    if (typeof body.suspend !== "boolean") throw new Error()
    suspend = body.suspend
  } catch {
    return NextResponse.json({ error: "Expected { suspend: boolean }" }, { status: 400 })
  }

  // Don't let the admin lock themself out.
  if (userId === admin.id && suspend) {
    return NextResponse.json({ error: "You can't suspend your own account" }, { status: 400 })
  }

  try {
    const updated = await db.user.update({
      where: { id: userId },
      data: { suspendedAt: suspend ? new Date() : null },
    })
    return NextResponse.json({ ok: true, suspendedAt: updated.suspendedAt })
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
}
