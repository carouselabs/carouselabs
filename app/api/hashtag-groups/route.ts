// app/api/hashtag-groups/route.ts — Content Hub Library: saved hashtag sets,
// quick-inserted into a caption from the Custom Post composer.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// Accepts "#tag" or "tag" and normalizes to "#tag"; drops empties.
function normalizeHashtags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
    .map((h) => {
      const trimmed = h.trim().replace(/\s+/g, "")
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`
    })
    .slice(0, 30)
}

// GET /api/hashtag-groups — the user's saved groups, most recent first.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const groups = await db.hashtagGroup.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ groups })
}

// POST /api/hashtag-groups — create a group. Body: { name, hashtags: string[] }.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let name: string
  let hashtags: string[]

  try {
    const body = await req.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Missing name")
    name = body.name.trim().slice(0, 40)
    hashtags = normalizeHashtags(body.hashtags)
    if (hashtags.length === 0) throw new Error("Add at least one hashtag")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const group = await db.hashtagGroup.create({ data: { userId: user.id, name, hashtags } })
  return NextResponse.json({ group })
}
