// /api/admin/sequences
//   GET  — every sequence, with enrollment count + completion rate for the list view
//   POST — create a new sequence + its steps in one call (the builder always
//          submits the whole step list; stepOrder is assigned from array
//          position, not trusted from the client)
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { logAdminAction, getRequestIp } from "@/lib/auditLog"
import { SEGMENT_TYPES } from "@/lib/segments"

const VALID_SEGMENT_TYPES = new Set<string>(SEGMENT_TYPES.map((s) => s.value))

interface StepInput {
  delayDays: number
  subject: string
  subjectB?: string | null
  body: string
  bodyB?: string | null
}

function parseSteps(raw: unknown): StepInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("At least one step is required")
  return raw.map((s, i) => {
    const delayDays = Number(s?.delayDays)
    const subject = typeof s?.subject === "string" ? s.subject.trim() : ""
    const body = typeof s?.body === "string" ? s.body.trim() : ""
    if (!Number.isInteger(delayDays) || delayDays < 0) {
      throw new Error(`Step ${i + 1}: delayDays must be a non-negative integer`)
    }
    if (i === 0 && delayDays !== 0) throw new Error("The first step's delay must be 0 (sent on enrollment)")
    if (!subject) throw new Error(`Step ${i + 1}: subject is required`)
    if (!body) throw new Error(`Step ${i + 1}: body is required`)
    const subjectB = typeof s?.subjectB === "string" && s.subjectB.trim() ? s.subjectB.trim() : null
    const bodyB = typeof s?.bodyB === "string" && s.bodyB.trim() ? s.bodyB.trim() : null
    return { delayDays, subject, subjectB, body, bodyB }
  })
}

const VALID_STOP_RULES = new Set(["upgraded"])

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const sequences = await db.emailSequence.findMany({
    include: {
      steps: { select: { id: true } },
      enrollments: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = sequences.map((s) => {
    const total = s.enrollments.length
    const completed = s.enrollments.filter((e) => e.status === "completed").length
    return {
      id: s.id,
      name: s.name,
      active: s.active,
      segmentType: s.segmentType,
      segmentValue: s.segmentValue,
      stopRule: s.stopRule,
      stepCount: s.steps.length,
      enrollmentCount: total,
      completionRate: total > 0 ? completed / total : 0,
      createdAt: s.createdAt,
    }
  })

  return NextResponse.json({ sequences: rows })
}

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  let name: string
  let segmentType: string
  let segmentValue: string | null
  let stopRule: string | null
  let steps: StepInput[]
  try {
    const body = await req.json()
    name = typeof body.name === "string" ? body.name.trim() : ""
    segmentType = typeof body.segmentType === "string" ? body.segmentType : ""
    segmentValue = typeof body.segmentValue === "string" && body.segmentValue.trim() ? body.segmentValue.trim() : null
    stopRule = typeof body.stopRule === "string" && VALID_STOP_RULES.has(body.stopRule) ? body.stopRule : null
    if (!name) throw new Error("Name is required")
    if (!VALID_SEGMENT_TYPES.has(segmentType)) throw new Error("Invalid segmentType")
    steps = parseSteps(body.steps)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request body" }, { status: 400 })
  }

  const sequence = await db.emailSequence.create({
    data: {
      name,
      segmentType,
      segmentValue,
      stopRule,
      createdBy: admin.email,
      steps: {
        create: steps.map((s, i) => ({ stepOrder: i, ...s })),
      },
    },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  })

  // targetUserId is deliberately omitted — it's a User id everywhere else in
  // the audit log (the admin UI links it to /admin/users/[id]), and a
  // sequence id there would produce a broken/misleading link.
  await logAdminAction({
    adminEmail: admin.email,
    action: "CREATE_EMAIL_SEQUENCE",
    details: `Created sequence "${name}" (id ${sequence.id}, ${steps.length} step${steps.length === 1 ? "" : "s"}, segment: ${segmentType})`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, sequence })
}
