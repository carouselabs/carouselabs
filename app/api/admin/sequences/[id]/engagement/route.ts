// GET /api/admin/sequences/[id]/engagement — per-step (and per-A/B-variant)
// open/click rates for one sequence, computed from EmailEngagement rows (see
// app/api/webhooks/resend, which writes the opened/clicked/bounced rows).
//
// Rates are "distinct users who opened/clicked" / "distinct users sent to",
// not raw event counts — a step can only be sent to a given enrolled user
// once (currentStep advances monotonically), so this is equivalent to
// "fraction of sends that were opened/clicked" while staying immune to a
// user opening the same email multiple times (or a duplicate webhook
// delivery — see the route's own comment on why that isn't separately
// deduplicated).
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"

interface VariantStats {
  sent: number
  opened: number
  clicked: number
  openRate: number
  clickRate: number
}

function computeVariantStats(sent: Set<string>, opened: Set<string>, clicked: Set<string>): VariantStats {
  const sentCount = sent.size
  const openedCount = [...opened].filter((u) => sent.has(u)).length
  const clickedCount = [...clicked].filter((u) => sent.has(u)).length
  return {
    sent: sentCount,
    opened: openedCount,
    clicked: clickedCount,
    openRate: sentCount > 0 ? openedCount / sentCount : 0,
    clickRate: sentCount > 0 ? clickedCount / sentCount : 0,
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const { id } = await params
  const sequence = await db.emailSequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepOrder: "asc" } },
      enrollments: { select: { userId: true, variant: true } },
    },
  })
  if (!sequence) return NextResponse.json({ error: "Sequence not found" }, { status: 404 })

  const variantByUser = new Map(sequence.enrollments.map((e) => [e.userId, e.variant]))

  const engagement = await db.emailEngagement.findMany({
    where: { sequenceId: id },
    select: { stepId: true, userId: true, event: true },
  })

  const steps = sequence.steps.map((step) => {
    const hasVariant = !!(step.subjectB || step.bodyB)
    const rowsForStep = engagement.filter((e) => e.stepId === step.id)

    const sentAll = new Set<string>()
    const openedAll = new Set<string>()
    const clickedAll = new Set<string>()
    const bouncedAll = new Set<string>()
    const sentA = new Set<string>()
    const openedA = new Set<string>()
    const clickedA = new Set<string>()
    const sentB = new Set<string>()
    const openedB = new Set<string>()
    const clickedB = new Set<string>()

    for (const row of rowsForStep) {
      const variant = variantByUser.get(row.userId) ?? "A"
      if (row.event === "sent") {
        sentAll.add(row.userId)
        ;(variant === "B" ? sentB : sentA).add(row.userId)
      } else if (row.event === "opened") {
        openedAll.add(row.userId)
        ;(variant === "B" ? openedB : openedA).add(row.userId)
      } else if (row.event === "clicked") {
        clickedAll.add(row.userId)
        ;(variant === "B" ? clickedB : clickedA).add(row.userId)
      } else if (row.event === "bounced") {
        bouncedAll.add(row.userId)
      }
    }

    const overall = computeVariantStats(sentAll, openedAll, clickedAll)

    return {
      stepId: step.id,
      stepOrder: step.stepOrder,
      subject: step.subject,
      hasVariant,
      overall: { ...overall, bounced: bouncedAll.size },
      variantA: hasVariant ? computeVariantStats(sentA, openedA, clickedA) : undefined,
      variantB: hasVariant ? computeVariantStats(sentB, openedB, clickedB) : undefined,
    }
  })

  return NextResponse.json({ steps })
}
