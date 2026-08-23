import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

const VALID_STATUSES = ["draft", "queued", "publishing", "published", "failed", "cancelled"] as const
type Status = (typeof VALID_STATUSES)[number]

function isValidStatus(val: unknown): val is Status {
  return VALID_STATUSES.includes(val as Status)
}

// PATCH /api/content-hub/scheduled/[id] — reschedule (drag-and-drop a card to
// a new day/time) and/or change status (e.g. draft -> queued when the user
// decides to actually schedule it, or -> cancelled to pull it from the queue).
// Free — no credit charge either way.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.scheduledPost.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let scheduledFor: Date | undefined
  let status: Status | undefined

  try {
    const body = await req.json()
    if (body.scheduledFor !== undefined) {
      const parsed = new Date(body.scheduledFor)
      if (isNaN(parsed.getTime())) throw new Error("Invalid scheduledFor date")
      scheduledFor = parsed
    }
    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) throw new Error("Invalid status")
      status = body.status
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // A draft moving to "queued" is the moment it actually needs to publish —
  // that's when a LinkedIn connection is required, not when the draft was saved.
  const nextStatus = status ?? existing.status
  if (existing.platform === "linkedin" && nextStatus === "queued") {
    const linkedIn = await db.linkedInAccount.findUnique({ where: { userId: user.id } })
    if (!linkedIn) {
      return NextResponse.json({ error: "LinkedIn isn't connected yet" }, { status: 400 })
    }
  }
  if (existing.platform === "instagram" && nextStatus === "queued") {
    return NextResponse.json({ error: "Instagram isn't connected yet" }, { status: 400 })
  }

  const updated = await db.scheduledPost.update({
    where: { id },
    data: {
      ...(scheduledFor ? { scheduledFor } : {}),
      ...(status ? { status } : {}),
      // Manually rescheduling/reactivating clears any prior failure so the
      // card doesn't keep showing a stale red dot after the user fixes it.
      ...(status === "queued" ? { failureReason: null, retryCount: 0 } : {}),
    },
    include: {
      post: { select: { id: true, title: true, caption: true, format: true, imageUrls: true } },
    },
  })

  return NextResponse.json({ scheduled: updated })
}

// DELETE /api/content-hub/scheduled/[id] — remove from the queue/drafts
// entirely (the underlying Post is untouched, only the schedule entry goes).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.scheduledPost.findUnique({ where: { id } })
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.scheduledPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
