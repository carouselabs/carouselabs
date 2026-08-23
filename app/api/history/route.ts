import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dbEnumsToRawCategory } from "@/lib/ai/parsers/ideas"
import type { HistoryEntry, ThumbnailHistoryEntry, AnyHistoryEntry } from "@/lib/hooks/useHistory"

// GET /api/history — user's history, pinned first then newest visited first,
// each entry joined with its idea + latest caption preview + draft state.
// Thumbnail generations have no Idea behind them (see
// app/api/thumbnail/generate/route.ts — the Post is created standalone), so
// they're fetched separately and merged in below, sorted by their own
// createdAt against the unpinned idea entries' lastVisitedAt.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [rows, thumbnailPosts] = await Promise.all([
    db.ideaHistory.findMany({
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
    }),
    db.post.findMany({
      where: { userId: user.id, format: "THUMBNAIL" },
      orderBy: { createdAt: "desc" },
      select: { id: true, imageUrls: true, metadata: true, createdAt: true },
    }),
  ])

  const ideaEntries: HistoryEntry[] = rows.map((row) => {
    const latestPost = row.idea.posts[0]
    const caption = latestPost?.caption ?? null
    return {
      kind: "idea",
      id: row.id,
      ideaId: row.ideaId,
      status: row.status,
      isPinned: row.isPinned,
      lastVisitedAt: row.lastVisitedAt.toISOString(),
      idea: {
        hook: row.idea.hook,
        category: dbEnumsToRawCategory(row.idea.mode, row.idea.category),
      },
      captionPreview: caption ? caption.slice(0, 100).trim() : null,
      hasDraft: latestPost?.status === "DRAFT",
    }
  })

  const thumbnailEntries: ThumbnailHistoryEntry[] = thumbnailPosts.map((post) => {
    const metadata = post.metadata as { videoContent?: string } | null
    return {
      kind: "thumbnail",
      id: post.id,
      imageUrl: post.imageUrls[0] ?? "",
      videoContent: metadata?.videoContent ?? "",
      createdAt: post.createdAt.toISOString(),
    }
  })

  // Pinned ideas always lead (unchanged from before); everything else —
  // unpinned ideas and every thumbnail — is merged into one chronological
  // block underneath, using lastVisitedAt for ideas and createdAt for
  // thumbnails as the common sort key.
  const pinnedIdeas = ideaEntries.filter((e) => e.isPinned)
  const unpinnedIdeas = ideaEntries.filter((e) => !e.isPinned)
  const rest: AnyHistoryEntry[] = [...unpinnedIdeas, ...thumbnailEntries].sort((a, b) => {
    const ta = new Date(a.kind === "idea" ? a.lastVisitedAt : a.createdAt).getTime()
    const tb = new Date(b.kind === "idea" ? b.lastVisitedAt : b.createdAt).getTime()
    return tb - ta
  })

  const history: AnyHistoryEntry[] = [...pinnedIdeas, ...rest]

  return NextResponse.json({ history })
}
