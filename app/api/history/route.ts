import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dbEnumsToRawCategory } from "@/lib/ai/parsers/ideas"

// GET /api/history — user's history, pinned first then newest visited first,
// each entry joined with its idea + latest caption preview + draft state.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.ideaHistory.findMany({
    where: { userId: user.id },
    orderBy: [{ isPinned: "desc" }, { lastVisitedAt: "desc" }],
    include: {
      idea: {
        select: {
          hook: true,
          mode: true,
          category: true,
          posts: {
            where: { caption: { not: null } },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { caption: true, status: true },
          },
        },
      },
    },
  })

  const history = rows.map((row) => {
    const latestPost = row.idea.posts[0]
    const caption = latestPost?.caption ?? null
    return {
      id: row.id,
      ideaId: row.ideaId,
      status: row.status,
      isPinned: row.isPinned,
      lastVisitedAt: row.lastVisitedAt,
      idea: {
        hook: row.idea.hook,
        category: dbEnumsToRawCategory(row.idea.mode, row.idea.category),
      },
      captionPreview: caption ? caption.slice(0, 100).trim() : null,
      hasDraft: latestPost?.status === "DRAFT",
    }
  })

  return NextResponse.json({ history })
}
