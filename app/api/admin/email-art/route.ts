// GET /api/admin/email-art?kind=picture|sticker — the AI email writer's saved
// art (lib/emailArtLibrary.ts), newest first, for picking one in the writer.
//   → { art: [{ id, kind, url, description, createdAt }] }
import { NextResponse } from "next/server"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { listArt } from "@/lib/emailArtLibrary"

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const kind = new URL(req.url).searchParams.get("kind")
  if (kind !== "picture" && kind !== "sticker") {
    return NextResponse.json({ error: "kind must be picture or sticker" }, { status: 400 })
  }
  return NextResponse.json({ art: await listArt(kind) })
}
