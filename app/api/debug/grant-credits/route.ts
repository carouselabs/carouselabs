import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST() {
  // Kill switch: endpoint is inert unless DEBUG_ENDPOINTS=1 is set in env vars.
  // Returns 404 so it looks like it doesn't exist when disabled.
  if (process.env.DEBUG_ENDPOINTS !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress

  // SECURITY: only allow this for my specific email
  const ALLOWED_EMAIL = "carouselabs@gmail.com"
  if (email !== ALLOWED_EMAIL) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  const dbUser = await db.user.findUnique({ where: { clerkId } })
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  await db.subscription.update({
    where: { userId: dbUser.id },
    data: {
      plan: "PRO",
      creditsUsed: 0,
      creditsTotal: 100,
    },
  })

  return NextResponse.json({ success: true, message: "Granted 100 credits to carouselabs@gmail.com" })
}
