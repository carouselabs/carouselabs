// app/api/ext/x/profiles/[id]/route.ts — edit and delete one of the user's
// own X profiles (XProfile), for the X panel and the website. Every query is
// scoped to { userId, isSystem: false }, so a token can neither touch another
// account's profile nor change a CarouseLabs preset. Same rules as LinkedIn's
// app/api/ext/profiles/[id].
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { parseProfileInput } from "@/lib/commentProfiles"
import { xLengthProblem } from "@/lib/xProfiles"

// PUT /api/ext/x/profiles/:id — the whole profile, revalidated; optionally
// { setAsDefault: true }.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = parseProfileInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const tooLong = xLengthProblem(parsed.value.length)
  if (tooLong) return NextResponse.json({ error: tooLong }, { status: 400 })

  const result = await db.xProfile.updateMany({ where: { id, userId: user.id, isSystem: false }, data: parsed.value })
  if (result.count === 0) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  if ((body as { setAsDefault?: unknown })?.setAsDefault === true) {
    await db.xUserSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, defaultProfileId: id },
      update: { defaultProfileId: id },
    })
  }

  const profile = await db.xProfile.findUnique({ where: { id } })
  return NextResponse.json({ profile })
}

// DELETE /api/ext/x/profiles/:id
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const result = await db.xProfile.deleteMany({ where: { id, userId: user.id, isSystem: false } })
  if (result.count === 0) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  // A deleted default falls back to the shared preset, rather than leaving
  // the panel to preselect a profile that no longer exists.
  await db.xUserSettings.updateMany({ where: { userId: user.id, defaultProfileId: id }, data: { defaultProfileId: null } })

  return NextResponse.json({ ok: true })
}
