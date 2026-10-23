// app/api/ext/reddit/profiles/route.ts — CarouseLabs Engage for Reddit's voice
// profiles (RedditProfile), for the Reddit extension's panel and the website
// (either caller: see getExtensionUser). Kept apart from LinkedIn's and X's,
// with the same fields and validation.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { listRedditProfiles } from "@/lib/extensionData"
import { parseProfileInput } from "@/lib/commentProfiles"
import { REDDIT_MAX_PROFILE_LENGTH, redditLengthProblem } from "@/lib/redditProfiles"

// GET — the CarouseLabs presets for Reddit, then this user's own, plus which
// one is their default.
export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const [profiles, settings] = await Promise.all([
    listRedditProfiles(user.id),
    db.redditUserSettings.findUnique({ where: { userId: user.id }, select: { defaultProfileId: true } }),
  ])

  return NextResponse.json({ profiles, defaultProfileId: settings?.defaultProfileId ?? null })
}

// POST — create one of this user's own Reddit profiles.
export async function POST(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = parseProfileInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const tooLong = redditLengthProblem(parsed.value.length)
  if (tooLong) return NextResponse.json({ error: tooLong }, { status: 400 })

  const profile = await db.redditProfile.create({
    data: { ...parsed.value, userId: user.id, isSystem: false, isDefault: false },
  })

  if ((body as { setAsDefault?: unknown })?.setAsDefault === true) {
    await db.redditUserSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, defaultProfileId: profile.id },
      update: { defaultProfileId: profile.id },
    })
  }

  return NextResponse.json({ profile, maxLength: REDDIT_MAX_PROFILE_LENGTH }, { status: 201 })
}
