// app/api/ideas-board/capture/route.ts — called by browser-extension-ideas/
// (see its background.js), never by the CarouseLabs web app itself. Uses the
// extension API key (Authorization: Bearer <key>) instead of a Clerk session,
// since a browser extension has no session cookie to send. See
// lib/extensionAuth.ts and prisma/schema.prisma's ExtensionApiKey comment.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromExtensionKey } from "@/lib/extensionAuth"

const VALID_TYPES = ["link", "image", "note"] as const
type ItemType = (typeof VALID_TYPES)[number]

function isValidType(val: unknown): val is ItemType {
  return VALID_TYPES.includes(val as ItemType)
}

// POST /api/ideas-board/capture — right-click "Save to CarouseLabs Ideas
// Board" on any image, link, or selected text. Body: { type, content, title?,
// sourceUrl? }.
export async function POST(req: Request) {
  const user = await getUserFromExtensionKey(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension key" }, { status: 401 })

  let type: ItemType
  let content: string
  let title: string | null
  let sourceUrl: string | null

  try {
    const body = await req.json()
    if (!isValidType(body.type)) throw new Error("type must be 'link', 'image', or 'note'")
    type = body.type
    if (typeof body.content !== "string" || !body.content.trim()) throw new Error("Missing content")
    // A generous cap — this is a scratchpad note/URL, not a document; keeps a
    // pathological "select entire page" capture from writing an unbounded row.
    content = body.content.trim().slice(0, 20_000)
    title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 300) : null
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

  return NextResponse.json({ ok: true, item })
}
