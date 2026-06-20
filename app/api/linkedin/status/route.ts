import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Lightweight read of the current user's LinkedIn connection, used by the
// settings page and the "Post to LinkedIn" buttons.
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ connected: false }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { linkedIn: true },
  })

  const li = user?.linkedIn
  return NextResponse.json({
    connected: !!li,
    name: li?.name ?? null,
    expired: li?.expiresAt ? li.expiresAt.getTime() < Date.now() : false,
  })
}
