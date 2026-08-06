// GET  /api/admin/interns — all interns with computed point totals, shaped
// for the admin interns table.
// POST /api/admin/interns — create a new intern (clerkId linked later on
// first matching sign-in).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { summarizeEntries } from "@/lib/internPoints"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const interns = await db.intern.findMany({
    orderBy: { createdAt: "desc" },
    include: { entries: { select: { points: true, date: true } } },
  })

  // Ranked by all-time total points, descending — this list doubles as the
  // admin leaderboard.
  const rows = interns
    .map((i) => {
      const { total, pointsToday, pointsThisWeek } = summarizeEntries(i.entries)
      const lastEntryDate = i.entries.reduce<Date | null>(
        (max, e) => (!max || e.date > max ? e.date : max),
        null,
      )
      return {
        id: i.id,
        name: i.name,
        email: i.email,
        active: i.active,
        createdAt: i.createdAt,
        totalPoints: total,
        pointsToday,
        pointsThisWeek,
        lastEntryDate,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)

  return NextResponse.json({ interns: rows })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let name: string
  let email: string
  try {
    const body = await req.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new Error()
    if (typeof body.email !== "string" || !body.email.trim()) throw new Error()
    name = body.name.trim()
    email = body.email.trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: "name and email are required" }, { status: 400 })
  }

  try {
    const intern = await db.intern.create({ data: { name, email } })
    await logAdminAction({
      adminEmail: admin.email,
      action: "CREATE_INTERN",
      targetEmail: email,
      details: `Intern created: ${name} <${email}>`,
      ipAddress: getRequestIp(req),
    })
    return NextResponse.json({ intern })
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "An intern with this email already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create intern" }, { status: 500 })
  }
}
