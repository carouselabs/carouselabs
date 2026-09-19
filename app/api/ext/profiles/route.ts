// app/api/ext/profiles/route.ts — called by browser-extension-comment/'s
// Home screen to populate the Comment Profile dropdown. Bearer-token
// authenticated, same as app/api/ext/me (see lib/extensionCommentAuth.ts).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { parseProfileInput, customProfileLimit } from "@/lib/commentProfiles"

// GET /api/ext/profiles — every isSystem profile (shared, built-in presets —
// see scripts/seed-comment-profiles.js) plus this user's own custom
// profiles, system rows first.
export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const profiles = await db.commentProfile.findMany({
    where: { OR: [{ isSystem: true }, { userId: user.id }] },
    orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ profiles })
}

// POST /api/ext/profiles — create a custom profile for this user. Plan limits
// are enforced here rather than only in the UI: the extension is a client the
// user controls, so the client-side count is a hint and this is the rule.
export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseProfileInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const [subscription, existingCount] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id } }),
    db.commentProfile.count({ where: { userId: user.id, isSystem: false } }),
  ])

  const plan = subscription?.plan ?? "FREE"
  const limit = customProfileLimit(plan)
  if (limit !== null && existingCount >= limit) {
    return NextResponse.json(
      {
        error: `Your ${plan} plan allows ${limit} custom profile${limit === 1 ? "" : "s"}. Upgrade to create more profiles.`,
        requiresUpgrade: true,
        limit,
      },
      { status: 403 },
    )
  }

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
