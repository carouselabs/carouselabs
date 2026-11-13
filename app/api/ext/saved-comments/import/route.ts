// app/api/ext/saved-comments/import/route.ts — many saved comments at once
// (the website's CSV import; the file is read in the browser and arrives
// here as rows). Each row is checked like a single save. A row whose text is
// already saved, or repeats an earlier row, is skipped rather than doubled,
// and nothing goes past the per-person limit.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { parseSavedComment, SAVED_COMMENT_LIMITS, sameText, type SavedCommentInput } from "@/lib/engageSavedComments"

const PLATFORM = "linkedin"

// POST /api/ext/saved-comments/import — body: { items: [{ body, title?,
// tags?, favorite?, remindOn? }] }. Answers how many were saved and which
// rows (1 = the first) were skipped, and why.
export async function POST(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as { items?: unknown } | null
  const items = body?.items
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 })
  }
  if (items.length > SAVED_COMMENT_LIMITS.importRows) {
    return NextResponse.json(
      { error: `One import can bring in at most ${SAVED_COMMENT_LIMITS.importRows} rows. Split the file and import each part.` },
      { status: 400 },
    )
  }

  const existing = await db.engageSavedComment.findMany({
    where: { userId: user.id, platform: PLATFORM },
    select: { body: true },
  })
  const taken = existing.map((row) => row.body)
  let room = SAVED_COMMENT_LIMITS.perUser - existing.length

  const accepted: SavedCommentInput[] = []
  const skipped: { row: number; reason: string }[] = []
  items.forEach((item, index) => {
    const row = index + 1
    const parsed = parseSavedComment(item)
    if (!parsed.ok) return skipped.push({ row, reason: parsed.error })
    if (taken.some((text) => sameText(text, parsed.value.body))) {
      return skipped.push({ row, reason: "Already saved." })
    }
    if (room <= 0) return skipped.push({ row, reason: `You've reached ${SAVED_COMMENT_LIMITS.perUser} saved comments.` })
    accepted.push(parsed.value)
    taken.push(parsed.value.body)
    room -= 1
  })

  if (accepted.length) {
    await db.engageSavedComment.createMany({
      data: accepted.map((value) => ({ ...value, userId: user.id, platform: PLATFORM })),
    })
  }
  return NextResponse.json({ created: accepted.length, skipped })
}
