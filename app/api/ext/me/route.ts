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
    // Whether the user has dismissed the Insert risk warning. Server-side
    // rather than per-install, since the risk being acknowledged is to their
    // LinkedIn account, not to one browser.
    insertWarningHidden: user.insertWarningHidden,
  })
}

// PATCH /api/ext/me — currently only the Insert warning dismissal. Kept to a
// named allowlist rather than spreading the body, so a future field cannot be
// written from the extension by accident.
export async function PATCH(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const hidden = (body as { insertWarningHidden?: unknown } | null)?.insertWarningHidden

  if (typeof hidden !== "boolean") {
    return NextResponse.json({ error: "insertWarningHidden must be a boolean" }, { status: 400 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { insertWarningHidden: hidden },
  })

  return NextResponse.json({ ok: true, insertWarningHidden: hidden })
}
