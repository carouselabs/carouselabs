// app/api/account/delete/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/account/delete — soft delete: flag the account with deletedAt.
// Data is retained; the user is treated as deleted by the rest of the app.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await db.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
