// /api/cta — My CTA (lib/creatorCta.ts, lib/creatorCtaStore.ts).
//   GET  → { ready, photoUrl, cards, photoSources, profile }
//   POST { label, name, headline?, line, extra?, isDefault? } → { card } (up to 3)
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { CtaError, createCta, getMyCta } from "@/lib/creatorCtaStore"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await getMyCta(user))
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => null)
  try {
    return NextResponse.json({ card: await createCta(user.id, body ?? {}) }, { status: 201 })
  } catch (err) {
    if (err instanceof CtaError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
