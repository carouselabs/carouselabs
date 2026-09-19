// app/api/ext/history/[id]/route.ts — records what the user did with a
// generated comment. The row is created by app/api/ext/generate with
// action "NONE"; the extension PATCHes it to "COPIED" or "INSERTED" once the
// comment actually leaves the panel, which is what makes the history
// distinguishable from comments that were generated and then abandoned.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"

const ALLOWED_ACTIONS = ["COPIED", "INSERTED", "NONE"] as const
type Action = (typeof ALLOWED_ACTIONS)[number]

// Matches the cap app/api/ext/rewrite applies, so the two paths that can write
// this column agree on what is too long to store.
const MAX_COMMENT_CHARS = 4000

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ALLOWED_ACTIONS as readonly string[]).includes(value)
}

// PATCH /api/ext/history/:id
//   { action: "COPIED" | "INSERTED" | "NONE", comment?: string }
//
// `comment` is optional and exists because the output box is editable: a user
// can hand-edit a generated comment and copy that, in which case the row would
// otherwise keep text they never used. Same contract as the historyId sync in
// app/api/ext/rewrite — optional, scoped by userId, and never the reason a
// request fails.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const { id } = await params

  let action: Action
  let comment: string | undefined
  try {
    const body = await req.json()
    if (!isAction(body.action)) {
      throw new Error(`action must be one of: ${ALLOWED_ACTIONS.join(", ")}`)
    }
    action = body.action
    comment =
      typeof body.comment === "string" && body.comment.trim()
        ? body.comment.trim().slice(0, MAX_COMMENT_CHARS)
        : undefined
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  // Scoped by userId as well as id, so a valid token cannot mutate another
  // user's history row by guessing an id. updateMany rather than update
  // because it reports a miss as count 0 instead of throwing.
  const result = await db.commentHistory.updateMany({
    where: { id, userId: user.id },
    // comment is only written when supplied, so a caller sending action alone
    // cannot blank the stored text.
    data: { action, ...(comment ? { comment } : {}) },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "History entry not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, action })
}
