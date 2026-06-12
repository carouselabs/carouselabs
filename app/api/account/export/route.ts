// app/api/account/export/route.ts
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/account/export — all of the user's data as a downloadable JSON file.
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId },
    include: {
      profile: true,
      subscription: true,
      ideas: {
        orderBy: { createdAt: "desc" },
        include: { breakdowns: true },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        include: { slides: { orderBy: { order: "asc" } } },
      },
    },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.createdAt },
    profile: user.profile,
    subscription: user.subscription,
    ideas: user.ideas,
    posts: user.posts,
  }

  const json = JSON.stringify(payload, null, 2)
  const filename = `carouselabs-export-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
