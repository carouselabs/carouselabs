// POST /api/admin/interns/[id]/extend — extend an intern's internship: body
// { days: number, reason?: string } OR { months: number, reason?: string }
// (months are converted to days at creation time via monthsToDays — 1 month
// = 30 days — so InternExtension.addedDays is always the source of truth
// from then on, regardless of how the extension was entered). Creates an
// InternExtension audit row and moves the stored endDate forward off the
// *current* endDate (not joinDate + new total), so stacking extensions
// compounds correctly. Intern.durationMonths is intentionally left
// untouched — it's the original planned duration, not a running total; the
// true current length is joinDate..endDate (see formatInternshipDuration).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { calculateEndDate, addDays, monthsToDays, formatExtensionAmount } from "@/lib/internPoints"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params

  let addedDays: number
  let reason: string | null
  try {
    const body = await req.json()
    const hasDays = body.days !== undefined
    const hasMonths = body.months !== undefined

    if (hasDays === hasMonths) {
      // Neither provided, or both provided — ambiguous either way.
      throw new Error()
    }

    if (hasDays) {
      if (typeof body.days !== "number" || !Number.isInteger(body.days) || body.days < 1) throw new Error()
      addedDays = body.days
    } else {
      if (typeof body.months !== "number" || !Number.isInteger(body.months) || body.months < 1) throw new Error()
      addedDays = monthsToDays(body.months)
    }

    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null
  } catch {
    return NextResponse.json(
      { error: "Provide exactly one of: days (positive integer) or months (positive integer)" },
      { status: 400 },
    )
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const previousEndDate = intern.endDate ?? calculateEndDate(intern.joinDate, intern.durationMonths)
  const newEndDate = addDays(previousEndDate, addedDays)

  const [, updated] = await db.$transaction([
    db.internExtension.create({
      data: {
        internId: id,
        addedDays,
        reason,
        previousEndDate,
        newEndDate,
        extendedBy: admin.email,
      },
    }),
    db.intern.update({
      where: { id },
      data: {
        endDate: newEndDate,
        status: "extended",
      },
    }),
  ])

  await logAdminAction({
    adminEmail: admin.email,
    action: "EXTEND_INTERNSHIP",
    targetEmail: intern.email,
    details: `Extended by ${formatExtensionAmount(addedDays)}${reason ? ` (reason: "${reason}")` : ""} — new end date ${newEndDate.toISOString().slice(0, 10)}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, intern: updated })
}
