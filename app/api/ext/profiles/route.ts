// app/api/ext/profiles/route.ts — called by browser-extension-comment/'s
// Home screen to populate the Comment Profile dropdown. Bearer-token
// authenticated, same as app/api/ext/me (see lib/extensionCommentAuth.ts).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { parseProfileInput } from "@/lib/commentProfiles"

// GET /api/ext/profiles — every isSystem profile (shared, built-in presets —
// see scripts/seed-comment-profiles.js) plus this user's own custom
// profiles — recommended presets first, then system, then custom.
export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  // Recommended presets first, then the original system profiles, then the
  // user's own. Ordered here rather than in each screen so the Home dropdown,
  // Profiles list and Settings picker cannot disagree.
  const profiles = await db.commentProfile.findMany({
    where: { OR: [{ isSystem: true }, { userId: user.id }] },
    orderBy: [{ isRecommended: "desc" }, { isSystem: "desc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ profiles })
}

// POST /api/ext/profiles — create a custom profile for this user. There is no
// limit on how many.
export async function POST(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseProfileInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  // No limit on how many: custom tones are unlimited for everyone, and
  // the website's Free/Pro/Growth plans have nothing to do with them.
  const profile = await db.commentProfile.create({
    data: { ...parsed.value, userId: user.id, isSystem: false, isDefault: false },
  })

  // The user's default lives on User.defaultCommentProfileId, not on the
  // profile's own isDefault — that flag marks the shared system default, and
  // reusing it per user would make "default" mean two different things.
  if ((body as { setAsDefault?: unknown })?.setAsDefault === true) {
    await db.user.update({
      where: { id: user.id },
      data: { defaultCommentProfileId: profile.id },
    })
  }

  return NextResponse.json({ profile }, { status: 201 })
}
