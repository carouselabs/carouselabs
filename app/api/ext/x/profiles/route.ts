// app/api/ext/x/profiles/route.ts — CarouseLabs Engage for X's voice profiles
// (XProfile), for the X extension's panel and the website (either caller: see
// getExtensionUser). Kept apart from the LinkedIn extension's comment
// profiles (app/api/ext/profiles), with the same fields and validation.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { parseProfileInput } from "@/lib/commentProfiles"
import { X_MAX_PROFILE_LENGTH, xLengthProblem } from "@/lib/xProfiles"

// GET — the CarouseLabs presets for X, then this user's own, plus which one
// is their default.
export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const [profiles, settings] = await Promise.all([
    db.xProfile.findMany({
      where: { OR: [{ isSystem: true }, { userId: user.id }] },
      orderBy: [{ isRecommended: "desc" }, { isSystem: "desc" }, { createdAt: "asc" }],
    }),
    db.xUserSettings.findUnique({ where: { userId: user.id }, select: { defaultProfileId: true } }),
  ])

  return NextResponse.json({ profiles, defaultProfileId: settings?.defaultProfileId ?? null })
}

// POST — create one of this user's own X profiles. No limit on how many, as
// for LinkedIn profiles.
export async function POST(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = parseProfileInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const tooLong = xLengthProblem(parsed.value.length)
  if (tooLong) return NextResponse.json({ error: tooLong }, { status: 400 })

  const profile = await db.xProfile.create({
    data: { ...parsed.value, userId: user.id, isSystem: false, isDefault: false },
  })

  if ((body as { setAsDefault?: unknown })?.setAsDefault === true) {
    await db.xUserSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, defaultProfileId: profile.id },
      update: { defaultProfileId: profile.id },
    })
  }

  return NextResponse.json({ profile, maxLength: X_MAX_PROFILE_LENGTH }, { status: 201 })
}
