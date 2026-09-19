// app/api/ext/history/route.ts — the extension's History screen. Returns this
// user's generated comments, newest first.
//
// CommentHistory.profileId is a plain string, not a relation (see the model
// comment in prisma/schema.prisma: a history row deliberately survives the
// profile it was generated with being edited or deleted). So the profile name
// is resolved with a second query and mapped in, rather than an include, and
// a row whose profile has since been deleted still renders with a fallback
// label instead of disappearing.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(params.get("limit") ?? "", 10) || DEFAULT_LIMIT),
  )
  const cursor = params.get("cursor")

  // Cursor pagination on id, ordered by createdAt: stable under inserts in a
  // way offset pagination is not, since a new comment generated mid-scroll
  // would otherwise shift every later page by one.
  const rows = await db.commentHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // one extra to detect whether another page exists
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const profileIds = [...new Set(page.map((r) => r.profileId))]
  const profiles = await db.commentProfile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, name: true },
  })
  const nameById = new Map(profiles.map((p) => [p.id, p.name]))

  return NextResponse.json({
    entries: page.map((row) => ({
      id: row.id,
      postAuthor: row.postAuthor,
      postUrl: row.postUrl,
      postSnippet: row.postSnippet,
      comment: row.comment,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      profileName: nameById.get(row.profileId) ?? "Deleted profile",
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  })
}
