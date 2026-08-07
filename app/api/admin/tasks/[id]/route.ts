// PATCH /api/admin/tasks/[id] — update points and/or active status.
// No DELETE — tasks are soft-deleted (active:false) to preserve the task
// name/points that historical InternPointEntry rows reference by name.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let points: number | undefined
  let active: boolean | undefined
  let role: string | null | undefined
  try {
    const body = await req.json()
    if (body.points !== undefined) {
      if (typeof body.points !== "number" || !Number.isInteger(body.points)) throw new Error()
      points = body.points
    }
    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") throw new Error()
      active = body.active
    }
    if (body.role !== undefined) {
      if (body.role !== null && typeof body.role !== "string") throw new Error()
      role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : null
    }
    if (points === undefined && active === undefined && role === undefined) throw new Error()
  } catch {
    return NextResponse.json(
      { error: "Expected points (integer), active (boolean), and/or role (string or null)" },
      { status: 400 },
    )
  }

  try {
    const updated = await db.predefinedTask.update({ where: { id }, data: { points, active, role } })
    await logAdminAction({
      adminEmail: admin.email,
      action: "UPDATE_TASK",
      details: `Task "${updated.name}" updated${points !== undefined ? ` — ${points} pts` : ""}${
        active !== undefined ? ` — ${active ? "active" : "inactive"}` : ""
      }${role !== undefined ? ` — role: ${role ?? "all roles"}` : ""}`,
      ipAddress: getRequestIp(req),
    })
    return NextResponse.json({ task: updated })
  } catch {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }
}
