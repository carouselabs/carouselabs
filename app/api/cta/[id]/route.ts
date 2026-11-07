// /api/cta/[id] — one saved CTA (lib/creatorCtaStore.ts).
//   PATCH { label, name, headline?, line, extra?, isDefault? } → { card }
//   DELETE → { ok } (the oldest one left becomes the default)
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { CtaError, deleteCta, updateCta } from "@/lib/creatorCtaStore"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null)
  try {
    return NextResponse.json({ card: await updateCta(user.id, id, body ?? {}) })
  } catch (err) {
    if (err instanceof CtaError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    await deleteCta(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof CtaError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
