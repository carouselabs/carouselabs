// POST /api/admin/interns/[id]/extend — extend OR reduce an intern's
// internship: body { days: number, reason?: string } OR
// { months: number, reason?: string }, where the value is a non-zero
// integer — positive extends, negative reduces (months are converted to
// days via monthsToDays — 1 month = 30 days — so InternExtension.addedDays
// is always the single source of truth from then on, regardless of how the
// adjustment was entered or which direction it went). Creates an
// InternExtension audit row and moves the stored endDate off the *current*
// endDate (not joinDate + new total), so stacking adjustments compounds
// correctly. Intern.durationMonths is intentionally left untouched — it's
// the original planned duration, not a running total; the true current
// length is joinDate..endDate (see formatInternshipDuration).
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
      if (typeof body.days !== "number" || !Number.isInteger(body.days) || body.days === 0) throw new Error()
      addedDays = body.days
    } else {
      if (typeof body.months !== "number" || !Number.isInteger(body.months) || body.months === 0) throw new Error()
      addedDays = monthsToDays(body.months)
    }

    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null
  } catch {
    return NextResponse.json(
      {
        error:
          "Provide exactly one of: days or months, as a non-zero integer (positive to extend, negative to reduce)",
      },
      { status: 400 },
    )
  }

  const intern = await db.intern.findUnique({ where: { id } })
  if (!intern) return NextResponse.json({ error: "Intern not found" }, { status: 404 })

  const previousEndDate = intern.endDate ?? calculateEndDate(intern.joinDate, intern.durationMonths)
  const newEndDate = addDays(previousEndDate, addedDays)

  if (newEndDate <= intern.joinDate) {
    return NextResponse.json(
      { error: "That reduction would move the end date to before the internship's start date" },
      { status: 400 },
    )
  }

  // A reduction isn't the "extended" status this field otherwise means —
  // leave status exactly as it was rather than inventing a new value that
  // isn't part of the documented set ("active" | "completed" | "terminated" | "extended").
  const isExtension = addedDays > 0

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
        ...(isExtension ? { status: "extended" } : {}),
      },
    }),
  ])

  await logAdminAction({
    adminEmail: admin.email,
    action: isExtension ? "EXTEND_INTERNSHIP" : "REDUCE_INTERNSHIP",
    targetEmail: intern.email,
    details: `${isExtension ? "Extended" : "Reduced"} by ${formatExtensionAmount(addedDays)}${reason ? ` (reason: "${reason}")` : ""} — new end date ${newEndDate.toISOString().slice(0, 10)}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, intern: updated })
}
