// app/api/post-tags/route.ts — Content Hub Library: labels attachable to any
// Post (implicit many-to-many, see Post.tags) for filtering/grouping the
// calendar and list views.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

// GET /api/post-tags — the user's tags, alphabetical.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tags = await db.postTag.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({ tags })
}

// POST /api/post-tags — create a tag. Body: { name, color? }.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let name: string
  let color: string

  try {
    const body = await req.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Missing name")
    name = body.name.trim().slice(0, 40)
    color = typeof body.color === "string" && HEX_COLOR_RE.test(body.color) ? body.color : "#7C3AED"
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const tag = await db.postTag.create({ data: { userId: user.id, name, color } })
  return NextResponse.json({ tag })
}
