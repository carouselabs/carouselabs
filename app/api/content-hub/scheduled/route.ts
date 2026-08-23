import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

// Scheduling/drafting a post is free — it doesn't generate anything new, it
// just books a time for content that was already paid for at generation
// time. No credit checks or charges anywhere in this route.

const VALID_PLATFORMS = ["linkedin", "instagram"] as const
type Platform = (typeof VALID_PLATFORMS)[number]

function isValidPlatform(val: unknown): val is Platform {
  return VALID_PLATFORMS.includes(val as Platform)
}

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
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let postId: string
  let platform: Platform
  let scheduledFor: Date
  let status: "draft" | "queued"

  try {
    const body = await req.json()
    postId = typeof body.postId === "string" ? body.postId : ""
    if (!postId) throw new Error("Missing postId")
    if (!isValidPlatform(body.platform)) throw new Error("platform must be 'linkedin' or 'instagram'")
    platform = body.platform
    const parsed = new Date(body.scheduledFor)
    if (isNaN(parsed.getTime())) throw new Error("Invalid scheduledFor date")
    scheduledFor = parsed
    status = body.status === "draft" ? "draft" : "queued"
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // Instagram has no connection flow built yet — fail clearly server-side
  // rather than silently accepting a schedule that can never publish.
  if (platform === "instagram") {
    return NextResponse.json({ error: "Instagram isn't connected yet" }, { status: 400 })
  }

  const post = await db.post.findUnique({ where: { id: postId }, select: { userId: true } })
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  if (platform === "linkedin" && status === "queued") {
    const linkedIn = await db.linkedInAccount.findUnique({ where: { userId: user.id } })
    if (!linkedIn) {
      return NextResponse.json({ error: "LinkedIn isn't connected yet" }, { status: 400 })
    }
  }

  const scheduled = await db.scheduledPost.create({
    data: { userId: user.id, postId, platform, scheduledFor, status },
    include: {
      post: { select: { id: true, title: true, caption: true, format: true, imageUrls: true } },
    },
  })

  return NextResponse.json({ scheduled })
}
