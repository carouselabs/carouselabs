// app/api/pinned/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { dbEnumsToRawCategory } from "@/lib/ai/parsers/ideas"

// GET /api/pinned — every pinned idea for the current user, most recently
// pinned first. Pinning is just a saved-for-later flag: no session, no history,
// no post-limit impact.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db.idea.findMany({
    where: { userId: user.id, isPinned: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, hook: true, mode: true, category: true, updatedAt: true },
  })

  const pinned = rows.map((row) => ({
    id: row.id,
    hook: row.hook,
    category: dbEnumsToRawCategory(row.mode, row.category),
    pinnedAt: row.updatedAt,
  }))

  return NextResponse.json({ pinned })
}
