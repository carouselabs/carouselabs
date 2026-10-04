import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isFunctionalPlatform, type Platform } from "@/lib/platforms"
import { needsPublicationReconciliation } from "@/lib/scheduledPostState"

const VALID_STATUSES = [
  "draft",
  "queued",
  "failed",
  "cancelled",
  "pending_connection",
] as const
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
  let tagIds: string[] | undefined
  let confirmNotPublished = false

  try {
    const body = await req.json()
    confirmNotPublished = body.confirmNotPublished === true
    if (body.scheduledFor !== undefined) {
      const parsed = new Date(body.scheduledFor)
      if (isNaN(parsed.getTime())) throw new Error("Invalid scheduledFor date")
      scheduledFor = parsed
    }
    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) throw new Error("Invalid status")
      status = body.status
    }
    if (Array.isArray(body.tagIds)) {
      tagIds = body.tagIds.filter((t: unknown): t is string => typeof t === "string")
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (existing.status === "publishing" || existing.status === "published") {
    return NextResponse.json({ error: "This post is already publishing or published and cannot be rescheduled" }, { status: 409 })
  }
  if (needsPublicationReconciliation(existing.failureReason) && !confirmNotPublished) {
    return NextResponse.json({ error: "Check LinkedIn first. Confirm that this post was not published before changing its schedule.", requiresPublicationConfirmation: true }, { status: 409 })
  }

  // Tags live on the underlying Post, not this ScheduledPost row — same
  // "only ever connect tags you own" guard as the create route.
  if (tagIds) {
    const ownedTagIds = tagIds.length
      ? (await db.postTag.findMany({ where: { id: { in: tagIds }, userId: user.id }, select: { id: true } })).map(
          (t) => t.id,
        )
      : []
    await db.post.update({
      where: { id: existing.postId },
      data: { tags: { set: ownedTagIds.map((id) => ({ id })) } },
    })
  }

  // A draft moving to "queued" is the moment it actually needs to publish —
  // that's when a LinkedIn connection is required, not when the draft was saved.
  const nextStatus = status ?? (existing.status as Status)
  if (existing.platform === "linkedin" && nextStatus === "queued") {
    const linkedIn = await db.linkedInAccount.findUnique({ where: { userId: user.id } })
    if (!linkedIn) {
      return NextResponse.json({ error: "LinkedIn isn't connected yet" }, { status: 400 })
    }
  }

  // Same downgrade as the create route: a platform with no real posting
  // access yet never gets rejected, just never actually reaches "queued".
  const effectiveNextStatus: Status =
    nextStatus === "queued" && !isFunctionalPlatform(existing.platform as Platform)
      ? "pending_connection"
      : nextStatus

  const updated = await db.scheduledPost.update({
    // Compare-and-swap: a cron claim after the read must win over rescheduling.
    where: { id, userId: user.id, status: existing.status, updatedAt: existing.updatedAt },
    data: {
      ...(scheduledFor ? { scheduledFor } : {}),
      ...(status ? { status: effectiveNextStatus } : {}),
      // Manually rescheduling/reactivating clears any prior failure so the
      // card doesn't keep showing a stale red dot after the user fixes it.
      ...(effectiveNextStatus === "queued" ? { failureReason: null, retryCount: 0 } : {}),
    },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          caption: true,
          format: true,
          imageUrls: true,
          tags: { select: { id: true, name: true, color: true } },
        },
      },
    },
  }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") return null
    throw error
  })

  if (!updated) return NextResponse.json({ error: "The schedule changed. Refresh before trying again." }, { status: 409 })

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

  if (existing.status === "publishing" || needsPublicationReconciliation(existing.failureReason)) {
    return NextResponse.json({ error: "Publication must be reconciled before removing this schedule" }, { status: 409 })
  }
  const removed = await db.scheduledPost.deleteMany({ where: { id, userId: user.id, status: existing.status, updatedAt: existing.updatedAt } })
  if (!removed.count) return NextResponse.json({ error: "The schedule changed. Refresh before trying again." }, { status: 409 })
  return NextResponse.json({ ok: true })
}
