// app/api/ext/connection-profiles/route.ts — the Connection Note profile
// dropdown and builder in browser-extension-comment/. Bearer-token
// authenticated, same as the rest of app/api/ext/*.
//
// Mirrors app/api/ext/profiles (comment profiles) deliberately: same ordering,
// same plan-limit enforcement, same default handling — the two features should
// behave identically from the user's side.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { parseConnectionProfileInput, customConnectionProfileLimit } from "@/lib/connectionProfiles"

// GET /api/ext/connection-profiles — every isSystem profile (the CarouseLabs
// presets, see scripts/seed-connection-profiles.js) plus this user's own:
// recommended first, then system, then custom.
export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const profiles = await db.connectionProfile.findMany({
    where: { OR: [{ isSystem: true }, { userId: user.id }] },
    orderBy: [{ isRecommended: "desc" }, { isSystem: "desc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ profiles })
}

// POST /api/ext/connection-profiles — create a custom profile for this user.
// Plan limits are enforced here, not only in the UI: the extension is a client
// the user controls, so the client-side count is a hint and this is the rule.
export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = parseConnectionProfileInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const [subscription, existingCount] = await Promise.all([
    db.subscription.findUnique({ where: { userId: user.id } }),
    db.connectionProfile.count({ where: { userId: user.id, isSystem: false } }),
  ])

  const plan = subscription?.plan ?? "FREE"
  const limit = customConnectionProfileLimit(plan)
  if (limit !== null && existingCount >= limit) {
    return NextResponse.json(
      {
        error: `Your ${plan} plan allows ${limit} custom connection profile${limit === 1 ? "" : "s"}. Upgrade to create more.`,
        requiresUpgrade: true,
        limit,
      },
      { status: 403 },
    )
  }

  const profile = await db.connectionProfile.create({
    data: { ...parsed.value, userId: user.id, isSystem: false, isDefault: false },
  })

  // The user's default lives on User.defaultConnectionProfileId, not on the
  // profile's own isDefault — that flag marks the shared system default.
  if ((body as { setAsDefault?: unknown })?.setAsDefault === true) {
    await db.user.update({
      where: { id: user.id },
      data: { defaultConnectionProfileId: profile.id },
    })
  }

  return NextResponse.json({ profile }, { status: 201 })
}
