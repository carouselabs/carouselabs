// /api/admin/sequences/[id]
//   GET    — full detail: sequence, ordered steps, enrollment/engagement stats
//   PATCH  — update sequence fields and/or replace its full step list
//   DELETE — remove the sequence (cascades to steps + enrollments; historical
//            EmailEngagement rows survive with sequenceId/stepId set null —
//            see the schema comment)
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const sequence = await db.emailSequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      enrollments: { select: { status: true, variant: true } },
    },
  })
  if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 })

  const total = sequence.enrollments.length
  const byStatus = {
    active: sequence.enrollments.filter((e) => e.status === "active").length,
    completed: sequence.enrollments.filter((e) => e.status === "completed").length,
    stopped: sequence.enrollments.filter((e) => e.status === "stopped").length,
    exitedByRule: sequence.enrollments.filter((e) => e.status === "exited_by_rule").length,
  }

  return NextResponse.json({
    sequence: {
      id: sequence.id,
      name: sequence.name,
      active: sequence.active,
      segmentType: sequence.segmentType,
      segmentValue: sequence.segmentValue,
      stopRule: sequence.stopRule,
      createdBy: sequence.createdBy,
      createdAt: sequence.createdAt,
      steps: sequence.steps,
    },
    stats: { total, ...byStatus },
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const existing = await db.emailSequence.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Sequence not found" }, { status: 404 })

  let data: Record<string, unknown>
  let steps: StepInput[] | null = null
  try {
    const body = await req.json()
    data = {}
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim()
    if (typeof body.active === "boolean") data.active = body.active
    if (typeof body.segmentType === "string") {
      if (!VALID_SEGMENT_TYPES.has(body.segmentType)) throw new Error("Invalid segmentType")
      data.segmentType = body.segmentType
    }
    if ("segmentValue" in body) {
      data.segmentValue = typeof body.segmentValue === "string" && body.segmentValue.trim() ? body.segmentValue.trim() : null
    }
    if ("stopRule" in body) {
      data.stopRule = typeof body.stopRule === "string" && VALID_STOP_RULES.has(body.stopRule) ? body.stopRule : null
    }
    if ("steps" in body) steps = parseSteps(body.steps)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request body" }, { status: 400 })
  }

  if (Object.keys(data).length === 0 && !steps) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  // Replacing steps is a delete-then-recreate, not a diff — simplest correct
  // approach for a builder that always submits its whole current step list.
  // NOTE: EmailSequenceEnrollment.currentStep is a plain integer position,
  // not a stepId reference (matches the spec's schema exactly) — so
  // reordering/removing steps out from under users already mid-sequence can
  // desync their progress (they may skip or repeat a step). The builder UI
  // warns about this when the sequence has active enrollments; there's no
  // way to prevent it at the schema level without changing currentStep to a
  // stepId FK, which wasn't how this was specified.
  const sequence = await db.$transaction(async (tx) => {
    if (steps) {
      await tx.emailSequenceStep.deleteMany({ where: { sequenceId: id } })
      await tx.emailSequenceStep.createMany({
        data: steps.map((s, i) => ({ sequenceId: id, stepOrder: i, ...s })),
      })
    }
    if (Object.keys(data).length > 0) {
      await tx.emailSequence.update({ where: { id }, data })
    }
    return tx.emailSequence.findUniqueOrThrow({
      where: { id },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })
  })

  await logAdminAction({
    adminEmail: admin.email,
    action: "UPDATE_EMAIL_SEQUENCE",
    details: `Updated sequence "${sequence.name}" (id ${id})${steps ? " — steps replaced" : ""}`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true, sequence })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const existing = await db.emailSequence.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Sequence not found" }, { status: 404 })

  await db.emailSequence.delete({ where: { id } })

  await logAdminAction({
    adminEmail: admin.email,
    action: "DELETE_EMAIL_SEQUENCE",
    details: `Deleted sequence "${existing.name}" (id ${id})`,
    ipAddress: getRequestIp(req),
  })

  return NextResponse.json({ ok: true })
}
