// app/api/ext/profiles/route.ts — called by browser-extension-comment/'s
// Home screen to populate the Comment Profile dropdown. Bearer-token
// authenticated, same as app/api/ext/me (see lib/extensionCommentAuth.ts).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"

// GET /api/ext/profiles — every isSystem profile (shared, built-in presets —
// see scripts/seed-comment-profiles.js) plus this user's own custom
// profiles, system rows first.
export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const profiles = await db.commentProfile.findMany({
    where: { OR: [{ isSystem: true }, { userId: user.id }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ profiles })
}
