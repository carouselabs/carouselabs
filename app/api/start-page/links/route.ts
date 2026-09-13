import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isSafeLinkUrl } from "@/lib/startPage"

// POST /api/start-page/links — add a link to the end of the user's Start
// Page. Body: { label, url }.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const startPage = await db.startPage.findUnique({ where: { userId: user.id } })
  if (!startPage) return NextResponse.json({ error: "Create your Start Page first" }, { status: 404 })

  let label: string
  let url: string

  try {
    const body = await req.json()
    if (typeof body.label !== "string" || !body.label.trim()) throw new Error("Missing label")
    label = body.label.trim().slice(0, 60)
    if (typeof body.url !== "string" || !isSafeLinkUrl(body.url.trim())) {
      throw new Error("url must be a valid http(s) link")
    }
    url = body.url.trim()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const last = await db.startPageLink.findFirst({
    where: { startPageId: startPage.id },
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const link = await db.startPageLink.create({
    data: { startPageId: startPage.id, label, url, order: (last?.order ?? -1) + 1 },
  })

  return NextResponse.json({ link })
}
