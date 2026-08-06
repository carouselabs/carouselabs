// GET  /api/admin/tasks — list predefined tasks (?active=true narrows to
// active-only, used by the Quick Task dropdown; unfiltered by default, used
// by the Manage Tasks page).
// POST /api/admin/tasks — create a new predefined task.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const activeOnly = new URL(req.url).searchParams.get("active") === "true"

  const tasks = await db.predefinedTask.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let name: string
  let points: number
  try {
    const body = await req.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new Error()
    if (typeof body.points !== "number" || !Number.isInteger(body.points)) throw new Error()
    name = body.name.trim()
    points = body.points
  } catch {
    return NextResponse.json({ error: "name (string) and points (integer) are required" }, { status: 400 })
  }

  try {
    const task = await db.predefinedTask.create({ data: { name, points } })
    await logAdminAction({
      adminEmail: admin.email,
      action: "CREATE_TASK",
      details: `Task created: "${name}" (${points} pts)`,
      ipAddress: getRequestIp(req),
    })
    return NextResponse.json({ task })
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "A task with this name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
