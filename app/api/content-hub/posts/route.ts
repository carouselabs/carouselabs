import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"

// GET /api/content-hub/posts?q=search — the user's finished generated posts
// (caption/image/carousel/thumbnail alike), most recent first, for the
// Content Hub "pick content" step. READY covers image/carousel/thumbnail
// generations (created READY at generation time); DRAFT covers the
// caption-only flow, which saves as DRAFT via POST /api/posts and never
// transitions to READY on its own — without it, "Save Draft" captions would
// never be schedulable here. Nothing already GENERATING/PUBLISHED/FAILED.
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = new URL(req.url).searchParams.get("q")?.trim()

  const where: Prisma.PostWhereInput = { userId: user.id, status: { in: ["READY", "DRAFT"] } }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { caption: { contains: q, mode: "insensitive" } },
    ]
  }

  const posts = await db.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, title: true, caption: true, format: true, imageUrls: true, createdAt: true },
  })

  return NextResponse.json({ posts })
}
