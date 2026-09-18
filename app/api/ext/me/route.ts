// app/api/ext/me/route.ts — called by browser-extension-comment/ to fetch
// the signed-in user's basic account info (email, plan, credits, default
// comment profile) for its Account/Home screens. Bearer-token authenticated
// via lib/extensionCommentAuth.ts — same pattern as
// app/api/ideas-board/capture using lib/extensionAuth.ts.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { availableCredits } from "@/lib/credits"

// GET /api/ext/me
export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const subscription = await db.subscription.findUnique({ where: { userId: user.id } })
  if (!subscription) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 })
  }

  return NextResponse.json({
    email: user.email,
    plan: subscription.plan,
    creditsAvailable: availableCredits(subscription),
    defaultCommentProfileId: user.defaultCommentProfileId,
  })
}
