// app/api/ext/me/route.ts — called by browser-extension-comment/ to fetch
// the signed-in user's basic account info (email, plan, credits, default
// comment profile) for its Account/Home screens. Bearer-token authenticated
// via lib/extensionCommentAuth.ts — same pattern as
// app/api/ideas-board/capture using lib/extensionAuth.ts.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { availableCredits } from "@/lib/credits"
import { COMMENT_CREDITS_ENFORCED } from "@/lib/commentCredits"

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

  // Calendar month, matching the "month" branch of getPeriodRange in
  // lib/internPoints.ts: first of this month to first of next. Calendar rather
  // than rolling 30 days, so the figure lines up with how a billing period
  // reads to the user.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Today's count drives the pacing nudge in the side panel. Calendar day in
  // server time, consistent with how commentsThisMonth is bounded.
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [commentsThisMonth, commentsToday] = await Promise.all([
    db.commentHistory.count({
      where: { userId: user.id, createdAt: { gte: monthStart, lt: nextMonthStart } },
    }),
    db.commentHistory.count({
      where: { userId: user.id, createdAt: { gte: dayStart } },
    }),
  ])

  return NextResponse.json({
    email: user.email,
    plan: subscription.plan,
    creditsAvailable: availableCredits(subscription),
    // TESTING PHASE ONLY while false (lib/commentCredits.ts). The side panel
    // only blocks Generate on a zero balance when this is true, so the flag
    // controls client and server together and restoring needs no extension
    // rebuild.
    creditsEnforced: COMMENT_CREDITS_ENFORCED,
    commentsThisMonth,
    commentsToday,
    defaultCommentProfileId: user.defaultCommentProfileId,
    defaultConnectionProfileId: user.defaultConnectionProfileId,
    defaultLanguage: user.defaultLanguage,
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
