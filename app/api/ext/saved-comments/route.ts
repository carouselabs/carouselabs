// app/api/ext/saved-comments/route.ts — comments a person keeps to insert
// again (model EngageSavedComment; lib/engageSavedComments.ts): LinkedIn's
// side panel (Write screen) and the website's Engage → Saved comments.
// Either caller (getExtensionUser): the extension's token or the website's
// session, so both see and save the same list under the same rules.
//
// Free on every plan: nothing here calls a model.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import {
  parseSavedComment,
  SAVED_COMMENT_LIMITS,
  SAVED_COMMENT_ORDER,
  savedCommentForClient,
} from "@/lib/engageSavedComments"

const PLATFORM = "linkedin"

// GET /api/ext/saved-comments — this user's saved comments: favorites first,
// then the most recently used, then the newest.
export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const rows = await db.engageSavedComment.findMany({
    where: { userId: user.id, platform: PLATFORM },
    orderBy: SAVED_COMMENT_ORDER,
  })
  return NextResponse.json({ savedComments: rows.map(savedCommentForClient) })
}

// POST /api/ext/saved-comments — save one. body: { body, title?, tags?,
// favorite?, remindOn? }.
export async function POST(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const parsed = parseSavedComment(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const count = await db.engageSavedComment.count({ where: { userId: user.id, platform: PLATFORM } })
  if (count >= SAVED_COMMENT_LIMITS.perUser) {
    return NextResponse.json(
      { error: `You have ${SAVED_COMMENT_LIMITS.perUser} saved comments, the most there can be. Delete one to save another.` },
      { status: 400 },
    )
  }

  const row = await db.engageSavedComment.create({
    data: { ...parsed.value, userId: user.id, platform: PLATFORM },
  })
  return NextResponse.json({ savedComment: savedCommentForClient(row) }, { status: 201 })
}
