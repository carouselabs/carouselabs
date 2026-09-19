// app/api/cron/comment-history-cleanup/route.ts
// Daily cron (see vercel.json): enforces the 90-day retention window on
// CommentHistory. Fires from a schedule, not user action.
//
// Clerk exemption: this path is covered by the "/api/cron(.*)" matcher in
// proxy.ts. Verified by running Clerk's own createRouteMatcher against this
// exact path rather than assuming the pattern covers it —
// "/api/cron/comment-history-cleanup" returns true. Without that exemption
// Clerk's auth.protect() would intercept the request and 404 it before the
// CRON_SECRET check below ever ran, which has silently broken crons in this
// codebase before.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

const DAY_MS = 24 * 60 * 60 * 1000
const RETENTION_DAYS = 90

export async function GET(req: Request) {
  // Same secret gate as the other cron routes: Vercel Cron sends
  // `Authorization: Bearer <CRON_SECRET>`; a ?secret= query param is accepted
  // for manual runs.
  const secret = process.env.CRON_SECRET
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const provided = bearer ?? new URL(req.url).searchParams.get("secret")
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_MS)

  const { count } = await db.commentHistory.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  console.log(
    `[cron/comment-history-cleanup] deleted ${count} CommentHistory rows older than ${cutoff.toISOString()}`,
  )

  return NextResponse.json({ ok: true, deleted: count, cutoff: cutoff.toISOString() })
}
