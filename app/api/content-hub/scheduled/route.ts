import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { isValidPlatform, isFunctionalPlatform, type Platform } from "@/lib/platforms"
import { nextAvailableQueueSlot } from "@/lib/queue"

// Scheduling/drafting a post is free — it doesn't generate anything new, it
// just books a time for content that was already paid for at generation
// time. No credit checks or charges anywhere in this route.

// GET /api/content-hub/scheduled?from=ISO&to=ISO — every ScheduledPost for
// the current user in range, with enough of the underlying Post joined in to
// render a real thumbnail preview (not just a text label).
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: Prisma.ScheduledPostWhereInput = { userId: user.id }
  if (from || to) {
    where.scheduledFor = {}
    if (from && !isNaN(Date.parse(from))) where.scheduledFor.gte = new Date(from)
    if (to && !isNaN(Date.parse(to))) where.scheduledFor.lte = new Date(to)
  }

  const scheduled = await db.scheduledPost.findMany({
    where,
    orderBy: { scheduledFor: "asc" },
    include: {
      post: {
        select: { id: true, title: true, caption: true, format: true, imageUrls: true },
      },
    },
  })

  return NextResponse.json({ scheduled })
}

// POST /api/content-hub/scheduled — schedule (or draft) one of the user's
// existing generated posts. Body: { postId, platform, scheduledFor, status? }
// status defaults to "queued"; pass "draft" to save without queuing it.
// Alternatively, pass `useQueue: true` (+ optional `timeZone`) instead of
// `scheduledFor` — "Add to Queue" assigns the post to the next empty preset
// queue slot for this platform (see lib/queue.ts) rather than requiring the
// user to pick a time. Everything downstream (the row created, the cron
// publisher) is identical either way — the queue only decides the timestamp.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let postId: string
  let platform: Platform
  let scheduledFor: Date | null = null
  let useQueue = false
  let timeZone = "UTC"
  let status: "draft" | "queued"

  try {
    const body = await req.json()
    postId = typeof body.postId === "string" ? body.postId : ""
    if (!postId) throw new Error("Missing postId")
    if (!isValidPlatform(body.platform)) throw new Error("Unsupported platform")
    platform = body.platform
    status = body.status === "draft" ? "draft" : "queued"

    useQueue = body.useQueue === true
    if (typeof body.timeZone === "string" && body.timeZone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone }) // throws on an invalid IANA zone
        timeZone = body.timeZone
      } catch {
        timeZone = "UTC"
      }
    }

    if (!useQueue) {
      const parsed = new Date(body.scheduledFor)
      if (isNaN(parsed.getTime())) throw new Error("Invalid scheduledFor date")
      scheduledFor = parsed
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const post = await db.post.findUnique({ where: { id: postId }, select: { userId: true } })
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  if (useQueue) {
    // A draft doesn't need a real time yet, so queue-assignment only makes
    // sense for an actual "queued" request — "Add to Queue" is a scheduling
    // action, not a drafting one.
    if (status !== "queued") {
      return NextResponse.json({ error: "useQueue requires status \"queued\"" }, { status: 400 })
    }
    scheduledFor = await nextAvailableQueueSlot(user.id, platform, timeZone)
    if (!scheduledFor) {
      return NextResponse.json(
        { error: `No active queue slots for ${platform} — add one in Queue Settings first.` },
        { status: 400 },
      )
    }
  }

  if (platform === "linkedin" && status === "queued") {
    const linkedIn = await db.linkedInAccount.findUnique({ where: { userId: user.id } })
    if (!linkedIn) {
      return NextResponse.json({ error: "LinkedIn isn't connected yet" }, { status: 400 })
    }
  }

  // A platform with no real posting access yet is never rejected outright —
  // it's recorded so the intent is visible, just downgraded from "queued" to
  // "pending_connection" so the cron publisher (which only ever queries
  // status "queued") naturally leaves it alone until that platform goes live.
  const effectiveStatus: string =
    status === "queued" && !isFunctionalPlatform(platform) ? "pending_connection" : status

  const scheduled = await db.scheduledPost.create({
    data: { userId: user.id, postId, platform, scheduledFor: scheduledFor!, status: effectiveStatus },
    include: {
      post: { select: { id: true, title: true, caption: true, format: true, imageUrls: true } },
    },
  })

  return NextResponse.json({ scheduled })
}
