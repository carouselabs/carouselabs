import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Removes the current user's LinkedIn connection.
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({ where: { clerkId: userId } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // deleteMany so this is a no-op (not a throw) when nothing is connected.
  await db.linkedInAccount.deleteMany({ where: { userId: user.id } })

  return NextResponse.json({ success: true })
}
