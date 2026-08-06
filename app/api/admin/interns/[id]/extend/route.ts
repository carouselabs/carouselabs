// POST /api/admin/interns/[id]/extend — extend an intern's internship: body
// { addedMonths: number, reason?: string }. Creates an InternExtension audit
// row and bumps both durationMonths and the stored endDate off the *current*
// endDate (not joinDate + new total), so stacking extensions compounds
// correctly.
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { calculateEndDate } from "@/lib/internPoints"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let addedMonths: number
  let reason: string | null
  try {
    const body = await req.json()
    if (typeof body.addedMonths !== "number" || !Number.isInteger(body.addedMonths) || body.addedMonths < 1) {
      throw new Error()
    }
    addedMonths = body.addedMonths
    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null
  } catch {
    return NextResponse.json({ error: "addedMonths (positive integer) is required" }, { status: 400 })
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const previousEndDate = intern.endDate ?? calculateEndDate(intern.joinDate, intern.durationMonths)
  const newEndDate = calculateEndDate(previousEndDate, addedMonths)
  const newDurationMonths = intern.durationMonths + addedMonths

  const [, updated] = await db.$transaction([
    db.internExtension.create({
      data: {
        internId: id,
        addedMonths,
        reason,
        previousEndDate,
        newEndDate,
        extendedBy: admin.email,
      },
    }),
    db.intern.update({
      where: { id },
      data: {
        durationMonths: newDurationMonths,
        endDate: newEndDate,
        status: "extended",
      },
    }),
  ])

  await logAdminAction({
    adminEmail: admin.email,
    action: "EXTEND_INTERNSHIP",
    targetEmail: intern.email,
    details: `Extended by ${addedMonths} month${addedMonths === 1 ? "" : "s"}${reason ? ` (reason: "${reason}")` : ""} — new end date ${newEndDate.toISOString().slice(0, 10)}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, intern: updated })
}
