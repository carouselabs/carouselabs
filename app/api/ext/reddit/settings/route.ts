// app/api/ext/reddit/settings/route.ts — CarouseLabs Engage for Reddit's
// account settings (RedditUserSettings), for the Reddit panel and the website
// (either caller: see getExtensionUser). No row yet means the defaults.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { REDDIT_SETTINGS_DEFAULTS, REDDIT_SETTINGS_SELECT, loadRedditSettings, redditSettingsOf } from "@/lib/extensionData"

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  return NextResponse.json(await loadRedditSettings(user.id))
}

// PATCH — any of defaultProfileId (a Reddit profile you can use, or null),
// insertButtonHidden.
export async function PATCH(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const data: Partial<typeof REDDIT_SETTINGS_DEFAULTS> = {}

  if ("defaultProfileId" in body) {
    const id = body.defaultProfileId
    if (id === null) data.defaultProfileId = null
    else if (typeof id === "string") {
      const usable = await db.redditProfile.findFirst({
        where: { id, OR: [{ isSystem: true }, { userId: user.id }] },
        select: { id: true },
      })
      if (!usable) return NextResponse.json({ error: "Reddit profile not found" }, { status: 404 })
      data.defaultProfileId = id
    } else return NextResponse.json({ error: "defaultProfileId must be a profile id or null" }, { status: 400 })
  }

  if ("insertButtonHidden" in body) {
    if (typeof body.insertButtonHidden !== "boolean") {
      return NextResponse.json({ error: "insertButtonHidden must be a boolean" }, { status: 400 })
    }
    data.insertButtonHidden = body.insertButtonHidden
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No recognised settings in request" }, { status: 400 })
  }

  const row = await db.redditUserSettings.upsert({
    where: { userId: user.id },
    create: { ...REDDIT_SETTINGS_DEFAULTS, ...data, userId: user.id },
    update: data,
    select: REDDIT_SETTINGS_SELECT,
  })
  return NextResponse.json(redditSettingsOf(row))
}
