// app/api/posts/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifyFirstPostIfFirst } from "@/lib/email"

// GET /api/posts?ideaId=[id] — most recent saved post (with caption) for an
// idea, so a generation flow can restore the last session instead of
// regenerating from scratch.
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ideaId = new URL(req.url).searchParams.get("ideaId")
  if (!ideaId) return NextResponse.json({ error: "Missing ideaId" }, { status: 400 })

  const post = await db.post.findFirst({
    where: { userId: user.id, ideaId, caption: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, caption: true, updatedAt: true },
  })

  return NextResponse.json({ post: post ?? null })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let ideaId: string, caption: string
  try {
    const body = await req.json()
    ideaId = body.ideaId
    caption = body.caption
    if (!ideaId || typeof caption !== "string") throw new Error()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea || idea.userId !== user.id) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 })
  }

  const post = await db.post.create({
    data: {
      userId: user.id,
      ideaId,
      title: idea.hook,
      caption,
      format: "TEXT_ONLY",
      status: "DRAFT",
      imageUrls: [],
      r2Keys: [],
    },
  })

  // First-ever post? Send the celebratory email (best-effort).
  try {
    await notifyFirstPostIfFirst(user.id, user.email, user.profile?.name ?? "")
  } catch (err) {
    console.error("[posts] first-post email failed:", err)
  }

  return NextResponse.json({ postId: post.id })
}
