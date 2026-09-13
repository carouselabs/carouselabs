// app/api/start-page/check-slug/route.ts — live availability check for the
// editor's slug field. GET ?slug=xxx
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidSlug } from "@/lib/startPage"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const slug = new URL(req.url).searchParams.get("slug")?.toLowerCase().trim() ?? ""
  if (!isValidSlug(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" })
  }

  const existing = await db.startPage.findUnique({ where: { slug }, select: { userId: true } })
  // Taken by someone else → unavailable. Taken by the current user (their
  // own existing slug, unchanged) → still counts as "available" so the
  // editor doesn't falsely warn them off their own current value.
  const available = !existing || existing.userId === user.id

  return NextResponse.json({ available })
}
