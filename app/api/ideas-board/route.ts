// app/api/ideas-board/route.ts — Content Library / Ideas Board, saved for
// later and turned into a Custom Post whenever the user's ready (see
// app/(app)/content-hub/ideas/page.tsx). No AI generation, no credit charge.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

const VALID_TYPES = ["link", "image", "note"] as const
type ItemType = (typeof VALID_TYPES)[number]

function isValidType(val: unknown): val is ItemType {
  return VALID_TYPES.includes(val as ItemType)
}

// GET /api/ideas-board — the user's saved items, most recent first.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await db.ideaBoardItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ items })
}

// POST /api/ideas-board — save an item manually from inside the app. Body:
// { type, content, title?, sourceUrl? }. The browser extension's capture
// endpoint (app/api/ideas-board/capture) is separate since it authenticates
// differently (an extension API key, not a Clerk session).
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let type: ItemType
  let content: string
  let title: string | null
  let sourceUrl: string | null

  try {
    const body = await req.json()
    if (!isValidType(body.type)) throw new Error("type must be 'link', 'image', or 'note'")
    type = body.type
    if (typeof body.content !== "string" || !body.content.trim()) throw new Error("Missing content")
    content = body.content.trim()
    title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null
    sourceUrl = typeof body.sourceUrl === "string" && body.sourceUrl.trim() ? body.sourceUrl.trim() : null
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const item = await db.ideaBoardItem.create({
    data: { userId: user.id, type, content, title, sourceUrl },
  })

  return NextResponse.json({ item })
}
