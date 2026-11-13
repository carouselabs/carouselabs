// app/api/ext/activity/route.ts — comments (X: replies) per day, for the
// "comments per day" grids on the website's Engage → Activity and the side
// panel's Profile screen. Either caller (see getExtensionUser).
//
//   GET ?platform=linkedin|x|reddit   whose comments (default LinkedIn, as
//                                     with every other /api/ext route)
//       &tz=Asia/Kolkata              the browser's time zone, so days are
//                                     the person's own (default UTC)
//       &days=35                      how many days back, today included
//                                     (1–91: history is kept for 90 days)
//
// → { platform, timeZone, kind, one, many, days: [{ day: "2026-11-12", count }] }
//   Only days with at least one; the grids draw the rest empty.
import { NextResponse } from "next/server"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { parseEngagePlatform } from "@/lib/engage/features"
import { MAIN_HISTORY_KIND } from "@/lib/extensionHistory"
import { activityDays, clampActivityDays, safeTimeZone } from "@/lib/engage/activityDays"

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const platform = parseEngagePlatform(params.get("platform"))
  const timeZone = safeTimeZone(params.get("tz"))
  const days = clampActivityDays(params.get("days"))

  const rows = await activityDays(user.id, platform, timeZone, days)
  const main = MAIN_HISTORY_KIND[platform]

  return NextResponse.json({
    platform,
    timeZone,
    kind: main.kind,
    one: main.one,
    many: main.many,
    days: rows,
  })
}
