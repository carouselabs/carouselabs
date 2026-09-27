// app/api/ext/history/route.ts — History, for the side panel and the
// website's Extension section (either caller: see getExtensionUser). Returns
// this user's generations newest first — comments, replies, connection notes
// and messages — optionally filtered by ?kind=.
//
// CommentHistory.profileId is a plain string, not a relation (see the model
// comment in prisma/schema.prisma: a history row deliberately survives the
// profile it was generated with being edited or deleted). Rows written since
// history covered every kind carry their own profileName; older comment rows
// don't, so theirs is resolved with a second query, and a row whose profile
// has since been deleted still renders with a fallback label.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { isHistoryKind } from "@/lib/extensionHistory"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(params.get("limit") ?? "", 10) || DEFAULT_LIMIT),
  )
  const cursor = params.get("cursor")
  const kind = params.get("kind")
  if (kind !== null && !isHistoryKind(kind)) {
    return NextResponse.json({ error: "Unknown history kind" }, { status: 400 })
  }

  // Cursor pagination on id, ordered by createdAt: stable under inserts in a
  // way offset pagination is not, since a new comment generated mid-scroll
  // would otherwise shift every later page by one.
  const rows = await db.commentHistory.findMany({
    where: { userId: user.id, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit + 1, // one extra to detect whether another page exists
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  const unnamedProfileIds = [
    ...new Set(page.filter((r) => !r.profileName && r.profileId).map((r) => r.profileId as string)),
  ]
  const profiles = unnamedProfileIds.length
    ? await db.commentProfile.findMany({
        where: { id: { in: unnamedProfileIds } },
        select: { id: true, name: true },
      })
    : []
  const nameById = new Map(profiles.map((p) => [p.id, p.name]))

  return NextResponse.json({
    entries: page.map((row) => ({
      id: row.id,
      kind: row.kind,
      postAuthor: row.postAuthor,
      postUrl: row.postUrl,
      postSnippet: row.postSnippet,
      comment: row.comment,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      profileName:
        row.profileName ?? (row.profileId ? nameById.get(row.profileId) ?? "Deleted profile" : "No profile"),
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  })
}
