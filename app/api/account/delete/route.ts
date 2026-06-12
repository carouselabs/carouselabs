// app/api/account/delete/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// POST /api/account/delete — soft delete: flag the account with deletedAt.
// Data is retained; the user is treated as deleted by the rest of the app.
export async function POST() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({ where: { clerkId } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  await db.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
