// app/api/post-templates/route.ts — Content Hub Library: saved captions for
// reuse ("Save as Template" / "Load from Template" in the Custom Post
// composer). No AI generation, no credit charge.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/post-templates — the user's saved templates, most recent first.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const templates = await db.postTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ templates })
}

// POST /api/post-templates — save a new template. Body: { name, caption }.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let name: string
  let caption: string

  try {
    const body = await req.json()
    if (typeof body.name !== "string" || !body.name.trim()) throw new Error("Missing name")
    name = body.name.trim().slice(0, 60)
    if (typeof body.caption !== "string" || !body.caption.trim()) throw new Error("Missing caption")
    caption = body.caption.trim()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const template = await db.postTemplate.create({ data: { userId: user.id, name, caption } })
  return NextResponse.json({ template })
}
